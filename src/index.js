import WebSocket from 'ws';
import { loadConfig } from './config.js';
import { AsyncQueue } from './queue.js';
import { createCodeRegex, extractCodes, getMessageText, summarizeMessage } from './extractor.js';
import { CodeStore } from './store.js';

const RECONNECT_DELAY_MS = 3000;
const LOCAL_SUBMIT_TIMEOUT_MS = 5000;

async function main() {
  const config = await loadConfig();
  const codeRegex = createCodeRegex(config.codeRegex);
  const store = new CodeStore(config);

  await store.init();

  if (config.loadedFrom) {
    console.log(`[config] Loaded ${config.loadedFrom}`);
  } else {
    console.log('[config] config.json not found, using built-in defaults. Copy config.example.json to config.json to customize.');
  }

  console.log(`[config] wsUrl=${config.wsUrl}`);
  console.log(`[config] targetGroupId=${config.targetGroupId === 0 ? 'all groups' : config.targetGroupId}`);
  console.log(`[config] accessToken=${config.accessToken ? 'configured' : 'not configured'}`);
  console.log(`[config] enableClipboard=${config.enableClipboard}`);
  console.log(`[config] enableLocalSubmit=${config.enableLocalSubmit}`);

  const queue = new AsyncQueue(async (item) => {
    await store.saveSeenCodes();
    await store.appendCodeLog(item);

    console.log(
      `[code] ${item.time} group_id=${item.groupId} user_id=${item.userId} code=${item.code} latency_ms=${item.latencyMs ?? 'unknown'} message="${item.messageSummary}"`,
    );

    if (config.enableClipboard) {
      await copyToClipboard(item.code);
      console.log(`[clipboard] Copied latest code: ${item.code}`);
    }

    if (config.enableLocalSubmit) {
      await submitToLocalEndpoint(config.localSubmitUrl, item);
      console.log(`[local-submit] POST ${config.localSubmitUrl} code=${item.code}`);
    }
  });

  const app = new OneBotCodeListener({
    config,
    codeRegex,
    store,
    queue,
  });

  app.start();
}

class OneBotCodeListener {
  constructor({ config, codeRegex, store, queue }) {
    this.config = config;
    this.codeRegex = codeRegex;
    this.store = store;
    this.queue = queue;
    this.ws = null;
    this.reconnectTimer = null;
    this.stopped = false;
  }

  start() {
    this.connect();

    process.once('SIGINT', () => this.stop('SIGINT'));
    process.once('SIGTERM', () => this.stop('SIGTERM'));
  }

  connect() {
    if (this.stopped) {
      return;
    }

    console.log(`[ws] Connecting to ${this.config.wsUrl}`);
    this.ws = new WebSocket(this.config.wsUrl, {
      headers: this.config.accessToken
        ? {
            Authorization: `Bearer ${this.config.accessToken}`,
          }
        : undefined,
    });

    this.ws.on('open', () => {
      console.log('[ws] Connected');
    });

    this.ws.on('message', (data) => {
      this.handleMessage(data);
    });

    this.ws.on('close', (code, reason) => {
      const textReason = reason?.toString() || 'no reason';
      console.warn(`[ws] Closed code=${code} reason=${textReason}`);
      this.scheduleReconnect();
    });

    this.ws.on('error', (error) => {
      console.error(`[ws] Error: ${error.message}`);
    });
  }

  stop(signal) {
    this.stopped = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
    }

    console.log(`[app] Stopped by ${signal}`);
  }

  scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_DELAY_MS);

    console.log(`[ws] Reconnecting in ${RECONNECT_DELAY_MS}ms`);
  }

  handleMessage(data) {
    const event = parseOneBotEvent(data);

    if (!event || !this.shouldHandleEvent(event)) {
      return;
    }

    const text = getMessageText(event);
    const codes = extractCodes(text, this.codeRegex);

    if (codes.length === 0) {
      return;
    }

    const receivedAt = new Date();
    const time = receivedAt.toISOString();
    const eventTime = getEventTime(event);
    const latencyMs = eventTime ? receivedAt.getTime() - eventTime.getTime() : null;
    const messageSummary = summarizeMessage(text);

    for (const code of codes) {
      if (!this.store.add(code)) {
        continue;
      }

      this.queue.push({
        time,
        eventTime: eventTime?.toISOString() ?? null,
        latencyMs,
        groupId: event.group_id,
        userId: event.user_id,
        code,
        messageSummary,
      });
    }
  }

  shouldHandleEvent(event) {
    if (event.post_type !== 'message') {
      return false;
    }

    if (event.message_type !== 'group') {
      return false;
    }

    if (this.config.targetGroupId === 0) {
      return true;
    }

    return String(event.group_id) === String(this.config.targetGroupId);
  }
}

function getEventTime(event) {
  if (!Number.isFinite(event.time)) {
    return null;
  }

  return new Date(Number(event.time) * 1000);
}

function parseOneBotEvent(data) {
  const text = Buffer.isBuffer(data) ? data.toString('utf8') : String(data);

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn(`[ws] Skipped invalid JSON message: ${error.message}`);
    return null;
  }
}

let clipboardModulePromise = null;

async function copyToClipboard(code) {
  if (!clipboardModulePromise) {
    clipboardModulePromise = import('clipboardy');
  }

  const clipboardModule = await clipboardModulePromise;
  const write = clipboardModule.default?.write ?? clipboardModule.write;

  if (typeof write !== 'function') {
    throw new Error('clipboardy write function is unavailable');
  }

  await write(code);
}

async function submitToLocalEndpoint(url, item) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LOCAL_SUBMIT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        time: item.time,
        group_id: item.groupId,
        user_id: item.userId,
        code: item.code,
        message_summary: item.messageSummary,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timeout);
  }
}

main().catch((error) => {
  console.error(`[fatal] ${error.stack || error.message}`);
  process.exitCode = 1;
});

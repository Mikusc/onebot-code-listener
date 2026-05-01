import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import WebSocket from 'ws';
import { DEFAULT_CONFIG, loadConfig, normalizeConfig, saveConfig } from '../src/config.js';

const DEFAULT_PORT = 8788;
const HOST = '127.0.0.1';
const MAX_BODY_BYTES = 64 * 1024;
const CONNECT_TIMEOUT_MS = 3000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_FILE = path.join(PROJECT_ROOT, 'public', 'dashboard.html');

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const port = getPort();

const server = http.createServer(async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message,
    });
  }
});

server.listen(port, HOST, () => {
  console.log(`[dashboard] http://${HOST}:${port}`);
  console.log('[dashboard] Press Ctrl+C to stop.');
});

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || `${HOST}:${port}`}`);

  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/dashboard.html')) {
    await serveDashboard(res);
    return;
  }

  if (url.pathname === '/api/config') {
    if (req.method === 'GET') {
      await handleGetConfig(res);
      return;
    }

    if (req.method === 'POST') {
      await handleSaveConfig(req, res);
      return;
    }
  }

  if (req.method === 'POST' && url.pathname === '/api/test-ws') {
    await handleTestWebSocket(req, res);
    return;
  }

  sendJson(res, 404, {
    ok: false,
    error: 'Not found',
  });
}

async function serveDashboard(res) {
  const html = await fs.readFile(DASHBOARD_FILE, 'utf8');

  res.writeHead(200, {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(html);
}

async function handleGetConfig(res) {
  const config = await loadConfig();

  sendJson(res, 200, {
    ok: true,
    config: toConfigPayload(config),
    defaults: DEFAULT_CONFIG,
    loadedFrom: config.loadedFrom,
  });
}

async function handleSaveConfig(req, res) {
  const body = await readJsonBody(req);
  const saved = await saveConfig(body.config ?? body);

  sendJson(res, 200, {
    ok: true,
    config: toConfigPayload(saved),
    savedTo: saved.savedTo,
  });
}

async function handleTestWebSocket(req, res) {
  const body = await readJsonBody(req);
  const config = normalizeConfig({
    ...DEFAULT_CONFIG,
    ...(body.config ?? body),
  });

  await connectWebSocket(config);

  sendJson(res, 200, {
    ok: true,
    message: `Connected to ${config.wsUrl}`,
  });
}

function connectWebSocket(config) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const ws = new WebSocket(config.wsUrl, {
      headers: config.accessToken
        ? {
            Authorization: `Bearer ${config.accessToken}`,
          }
        : undefined,
    });

    const finish = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    const timeout = setTimeout(() => {
      ws.terminate();
      finish(new Error(`connection timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    ws.once('open', () => {
      ws.close();
      finish();
    });

    ws.once('error', (error) => {
      finish(error);
    });

    ws.once('close', (code) => {
      if (!settled && code !== 1000 && code !== 1005) {
        finish(new Error(`closed before open, code=${code}`));
      }
    });
  });
}

function toConfigPayload(config) {
  return {
    wsUrl: config.wsUrl,
    accessToken: config.accessToken,
    targetGroupId: config.targetGroupId,
    codeRegex: config.codeRegex,
    dedupeFile: config.dedupeFile,
    outputFile: config.outputFile,
    enableClipboard: config.enableClipboard,
    clipboardCodeIndex: config.clipboardCodeIndex,
    enableLocalSubmit: config.enableLocalSubmit,
    localSubmitUrl: config.localSubmitUrl,
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      body += chunk;

      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
        reject(new Error(`Request body exceeds ${MAX_BODY_BYTES} bytes`));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body.trim() ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error(`Invalid JSON body: ${error.message}`));
      }
    });

    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function getPort() {
  const argIndex = process.argv.indexOf('--port');
  const value = argIndex === -1 ? process.env.DASHBOARD_PORT : process.argv[argIndex + 1];
  const portNumber = Number(value || DEFAULT_PORT);

  if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
    throw new Error(`Invalid dashboard port: ${value}`);
  }

  return portNumber;
}

function printHelp() {
  console.log(`Usage: npm run dashboard

Starts a local dashboard for editing config.json.

Options:
  -- --port 8788        Use a custom local port

Environment:
  DASHBOARD_PORT=8788   Use a custom local port
`);
}

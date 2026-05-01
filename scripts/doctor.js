import fs from 'node:fs/promises';
import WebSocket from 'ws';
import { loadConfig } from '../src/config.js';

const CONNECT_TIMEOUT_MS = 3000;

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

let failed = false;

checkNodeVersion();
await checkDependency();

let config;
try {
  config = await loadConfig();
  if (config.loadedFrom) {
    pass(`Loaded config: ${config.loadedFrom}`);
  } else {
    warn('config.json not found; using built-in defaults. Run npm run setup to create one.');
  }

  info(`NapCat WebSocket URL: ${config.wsUrl}`);
  info(`Target group: ${config.targetGroupId === 0 ? 'all groups' : config.targetGroupId}`);
  info(`Code regex: ${config.codeRegex}`);
  info(`Access token: ${config.accessToken ? 'configured' : 'not configured'}`);
} catch (error) {
  fail(`Config error: ${error.message}`);
}

await checkDataDirectory();

if (config) {
  await checkWebSocket(config);
}

if (failed) {
  process.exitCode = 1;
}

function checkNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);

  if (Number.isInteger(major) && major >= 18) {
    pass(`Node.js ${process.versions.node}`);
    return;
  }

  fail(`Node.js ${process.versions.node}; require 18 or newer.`);
}

async function checkDependency() {
  try {
    await import('ws');
    pass('Dependency ws is installed');
  } catch {
    fail('Dependency ws is missing. Run npm install.');
  }
}

async function checkDataDirectory() {
  try {
    const stat = await fs.stat('data');

    if (stat.isDirectory()) {
      pass('data directory exists');
      return;
    }

    fail('data exists but is not a directory.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      warn('data directory does not exist yet; npm start will create it automatically.');
      return;
    }

    fail(`Cannot inspect data directory: ${error.message}`);
  }
}

async function checkWebSocket(config) {
  try {
    await connectWebSocket(config);
    pass(`Connected to ${config.wsUrl}`);
  } catch (error) {
    fail(`Cannot connect to ${config.wsUrl}: ${error.message}`);
    info('Check that NapCat is running and that OneBot v11 WebSocket server is enabled.');
    info('Recommended NapCat network config: WebSocket server, host 127.0.0.1, port 3001, messagePostFormat array.');
  }
}

function connectWebSocket(config) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(config.wsUrl, {
      headers: config.accessToken
        ? {
            Authorization: `Bearer ${config.accessToken}`,
          }
        : undefined,
    });

    const timeout = setTimeout(() => {
      ws.terminate();
      reject(new Error(`connection timed out after ${CONNECT_TIMEOUT_MS}ms`));
    }, CONNECT_TIMEOUT_MS);

    ws.once('open', () => {
      clearTimeout(timeout);
      ws.close();
      resolve();
    });

    ws.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    ws.once('close', (code) => {
      if (code !== 1000 && code !== 1005) {
        clearTimeout(timeout);
        reject(new Error(`closed before open, code=${code}`));
      }
    });
  });
}

function pass(message) {
  console.log(`[OK] ${message}`);
}

function warn(message) {
  console.warn(`[WARN] ${message}`);
}

function fail(message) {
  failed = true;
  console.error(`[FAIL] ${message}`);
}

function info(message) {
  console.log(`[INFO] ${message}`);
}

function printHelp() {
  console.log(`Usage: npm run doctor

Checks local readiness:
  - Node.js version
  - installed dependencies
  - config.json
  - data directory
  - NapCat OneBot WebSocket connectivity
`);
}

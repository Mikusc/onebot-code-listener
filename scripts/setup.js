import fs from 'node:fs/promises';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { DEFAULT_CONFIG } from '../src/config.js';

const CONFIG_PATH = 'config.json';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  printHelp();
  process.exit(0);
}

const existingConfig = await readJsonIfExists(CONFIG_PATH);
const defaults = {
  ...DEFAULT_CONFIG,
  ...existingConfig,
};

const rl = readline.createInterface({ input, output });

try {
  console.log('NapCat / OneBot listener setup');
  console.log('Press Enter to keep the value shown in brackets.\n');

  const wsUrl = await askString(rl, 'NapCat WebSocket URL', defaults.wsUrl);
  const accessToken = await askString(rl, 'Access token, leave empty if unused', defaults.accessToken);
  const targetGroupId = await askNumber(rl, 'Target group ID, 0 means all groups', defaults.targetGroupId);
  const codeRegex = await askRegex(rl, 'Code regex', defaults.codeRegex);

  const config = {
    ...defaults,
    wsUrl,
    accessToken,
    targetGroupId,
    codeRegex,
    enableClipboard: Boolean(defaults.enableClipboard),
    enableLocalSubmit: Boolean(defaults.enableLocalSubmit),
  };

  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(config, null, 2)}\n`, 'utf8');

  console.log(`\nWrote ${CONFIG_PATH}`);
  console.log(`Listening target: ${targetGroupId === 0 ? 'all groups' : `group ${targetGroupId}`}`);
  console.log('\nNext steps:');
  console.log('  1. Configure NapCat WebSocket server with host 127.0.0.1 and port 3001.');
  console.log('  2. Run npm run doctor.');
  console.log('  3. Run npm start.');
} finally {
  rl.close();
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {};
    }

    throw new Error(`Failed to read ${filePath}: ${error.message}`);
  }
}

async function askString(rl, label, defaultValue) {
  const answer = await rl.question(`${label} [${defaultValue}]: `);
  return answer.trim() || defaultValue;
}

async function askNumber(rl, label, defaultValue) {
  while (true) {
    const answer = await rl.question(`${label} [${defaultValue}]: `);
    const value = answer.trim() === '' ? Number(defaultValue) : Number(answer.trim());

    if (Number.isInteger(value) && value >= 0) {
      return value;
    }

    console.log('Please enter a non-negative integer.');
  }
}

async function askRegex(rl, label, defaultValue) {
  while (true) {
    const value = await askString(rl, label, defaultValue);

    try {
      new RegExp(value, 'g');
      return value;
    } catch (error) {
      console.log(`Invalid regex: ${error.message}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: npm run setup

Creates or updates config.json for this machine.

The script asks for:
  - NapCat OneBot WebSocket URL
  - optional access token
  - target group ID
  - code extraction regex
`);
}

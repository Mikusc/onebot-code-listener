import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_CONFIG = {
  wsUrl: 'ws://127.0.0.1:3001',
  accessToken: '',
  targetGroupId: 0,
  codeRegex: '\\b\\d{16}\\b',
  dedupeFile: 'data/seen-codes.json',
  outputFile: 'data/codes.log',
  enableClipboard: false,
  enableLocalSubmit: false,
  localSubmitUrl: 'http://127.0.0.1:8787/submit',
};

export async function loadConfig(configPath = 'config.json') {
  const resolvedPath = path.resolve(process.cwd(), configPath);
  let fileConfig = {};
  let loadedFrom = null;

  try {
    const content = await fs.readFile(resolvedPath, 'utf8');
    fileConfig = JSON.parse(content);
    loadedFrom = resolvedPath;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(`Failed to load ${resolvedPath}: ${error.message}`);
    }
  }

  const config = normalizeConfig({
    ...DEFAULT_CONFIG,
    ...fileConfig,
  });

  return {
    ...config,
    loadedFrom,
  };
}

function normalizeConfig(config) {
  const targetGroupId = Number(config.targetGroupId ?? DEFAULT_CONFIG.targetGroupId);

  if (!Number.isFinite(targetGroupId) || targetGroupId < 0) {
    throw new Error('targetGroupId must be a non-negative number. Use 0 to listen to all groups.');
  }

  assertString(config.wsUrl, 'wsUrl');
  assertString(config.codeRegex, 'codeRegex');
  assertString(config.dedupeFile, 'dedupeFile');
  assertString(config.outputFile, 'outputFile');
  assertString(config.localSubmitUrl, 'localSubmitUrl');

  try {
    new RegExp(config.codeRegex, 'g');
  } catch (error) {
    throw new Error(`Invalid codeRegex: ${error.message}`);
  }

  return {
    wsUrl: config.wsUrl,
    accessToken: typeof config.accessToken === 'string' ? config.accessToken : '',
    targetGroupId,
    codeRegex: config.codeRegex,
    dedupeFile: config.dedupeFile,
    outputFile: config.outputFile,
    enableClipboard: Boolean(config.enableClipboard),
    enableLocalSubmit: Boolean(config.enableLocalSubmit),
    localSubmitUrl: config.localSubmitUrl,
  };
}

function assertString(value, name) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${name} must be a non-empty string.`);
  }
}

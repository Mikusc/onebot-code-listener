import fs from 'node:fs/promises';
import path from 'node:path';

export class CodeStore {
  constructor({ dedupeFile, outputFile }) {
    this.dedupeFile = path.resolve(process.cwd(), dedupeFile);
    this.outputFile = path.resolve(process.cwd(), outputFile);
    this.seenCodes = new Set();
  }

  async init() {
    await fs.mkdir(path.dirname(this.dedupeFile), { recursive: true });
    await fs.mkdir(path.dirname(this.outputFile), { recursive: true });

    await this.loadSeenCodes();
    await ensureFile(this.outputFile, '');
  }

  has(code) {
    return this.seenCodes.has(code);
  }

  add(code) {
    if (this.seenCodes.has(code)) {
      return false;
    }

    this.seenCodes.add(code);
    return true;
  }

  async saveSeenCodes() {
    const codes = [...this.seenCodes].sort();
    const json = `${JSON.stringify(codes, null, 2)}\n`;
    const tmpPath = `${this.dedupeFile}.tmp`;

    await fs.writeFile(tmpPath, json, 'utf8');
    await fs.rename(tmpPath, this.dedupeFile);
  }

  async appendCodeLog(entry) {
    const line = `${JSON.stringify({
      time: entry.time,
      event_time: entry.eventTime,
      latency_ms: entry.latencyMs,
      group_id: entry.groupId,
      user_id: entry.userId,
      code: entry.code,
      message_summary: entry.messageSummary,
    })}\n`;

    await fs.appendFile(this.outputFile, line, 'utf8');
  }

  async loadSeenCodes() {
    try {
      const content = await fs.readFile(this.dedupeFile, 'utf8');
      const parsed = JSON.parse(content);
      const codes = Array.isArray(parsed) ? parsed : parsed?.codes;

      if (!Array.isArray(codes)) {
        throw new Error('expected an array of codes');
      }

      this.seenCodes = new Set(codes.map(String));
    } catch (error) {
      if (error.code === 'ENOENT') {
        await ensureFile(this.dedupeFile, '[]\n');
        this.seenCodes = new Set();
        return;
      }

      throw new Error(`Failed to load ${this.dedupeFile}: ${error.message}`);
    }
  }
}

async function ensureFile(filePath, defaultContent) {
  try {
    await fs.access(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }

    await fs.writeFile(filePath, defaultContent, 'utf8');
  }
}

import { Logger, LoggerService } from '@nestjs/common';
import {
  appendFile,
  mkdir,
  readFile,
  writeFile,
  readdir,
  stat,
  unlink,
} from 'node:fs/promises';
import { join } from 'node:path';
import * as tar from 'tar';

const LOGS_DIR = join(process.cwd(), 'logs');
const ARCHIVES_DIR = join(LOGS_DIR, 'archives');
const LOG_FILE = join(LOGS_DIR, 'app.log');
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const MAX_ARCHIVES = 3;

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
}

export class FileLogger implements LoggerService {
  private initialized = false;
  private readonly nestLogger = new Logger(FileLogger.name);

  private async init(): Promise<void> {
    if (this.initialized) return;
    try {
      await mkdir(ARCHIVES_DIR, { recursive: true });
      this.initialized = true;
    } catch {
      // mkdir failed — file writes will fallback to console
    }
  }

  private async write(
    level: LogLevel,
    message: unknown,
    context?: string,
  ): Promise<void> {
    await this.init();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? '',
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    // Mirror to NestJS native logger for live console output
    this.nestLogger[level === 'log' ? 'log' : level](
      `[${entry.context}] ${entry.message}`,
    );

    try {
      await appendFile(LOG_FILE, JSON.stringify(entry) + '\n', 'utf-8');
      await this.rotate();
    } catch {
      this.nestLogger.error(
        'Failed to write to log file — falling back to console only',
      );
    }
  }

  private async rotate(): Promise<void> {
    try {
      const raw = await readFile(LOG_FILE, 'utf-8');
      const lines = raw.trim().split('\n').filter(Boolean);
      if (lines.length === 0) return;

      const entries: LogEntry[] = lines.map((l) => JSON.parse(l) as LogEntry);
      const twoMonthsAgo = Date.now() - TWO_MONTHS_MS;

      const needsArchive = await this.checkNeedsArchive(twoMonthsAgo);
      if (needsArchive) {
        await this.createArchive();
        await this.pruneArchives();
      }

      // Purge entries older than 2 months
      const recent = entries.filter(
        (e) => new Date(e.timestamp).getTime() >= twoMonthsAgo,
      );
      await writeFile(
        LOG_FILE,
        recent.map((e) => JSON.stringify(e)).join('\n') + '\n',
        'utf-8',
      );
    } catch {
      this.nestLogger.error('Rotation failed — log file may be inconsistent');
    }
  }

  private async checkNeedsArchive(twoMonthsAgo: number): Promise<boolean> {
    try {
      const archives = await this.getSortedArchives();
      if (archives.length === 0) return false;

      const latest = archives.at(-1);
      if (!latest) return false;
      const raw = await this.readArchiveLatestEntry(join(ARCHIVES_DIR, latest));
      if (!raw) return true;

      return new Date(raw.timestamp).getTime() < twoMonthsAgo;
    } catch {
      return false;
    }
  }

  private async readArchiveLatestEntry(
    archivePath: string,
  ): Promise<LogEntry | null> {
    try {
      const lines: string[] = [];
      await tar.list({
        file: archivePath,
        onentry: (entry) => {
          const chunks: Buffer[] = [];
          entry.on('data', (chunk: Buffer) => chunks.push(chunk));
          entry.on('end', () => {
            const content = Buffer.concat(chunks).toString('utf-8');
            lines.push(...content.trim().split('\n').filter(Boolean));
          });
        },
      });
      if (lines.length === 0) return null;
      const last = lines.at(-1);
      if (!last) return null;
      return JSON.parse(last) as LogEntry;
    } catch {
      return null;
    }
  }

  private async createArchive(): Promise<void> {
    const date = new Date().toISOString().slice(0, 10);
    const archiveName = `logs-${date}.tar.gz`;
    await tar.create(
      { gzip: true, file: join(ARCHIVES_DIR, archiveName), cwd: LOGS_DIR },
      ['app.log'],
    );
  }

  private async pruneArchives(): Promise<void> {
    const archives = await this.getSortedArchives();
    while (archives.length > MAX_ARCHIVES) {
      const oldest = archives.shift()!;
      await unlink(join(ARCHIVES_DIR, oldest));
    }
  }

  private async getSortedArchives(): Promise<string[]> {
    try {
      const files = await readdir(ARCHIVES_DIR);
      const tarballs = files.filter((f) => f.endsWith('.tar.gz'));
      const withStats = await Promise.all(
        tarballs.map(async (f) => ({
          name: f,
          mtime: (await stat(join(ARCHIVES_DIR, f))).mtime,
        })),
      );
      return withStats
        .toSorted((a, b) => a.mtime.getTime() - b.mtime.getTime())
        .map((f) => f.name);
    } catch {
      return [];
    }
  }

  log(message: unknown, context?: string): void {
    void this.write('log', message, context);
  }
  error(message: unknown, _trace?: string, context?: string): void {
    void this.write('error', message, context);
  }
  warn(message: unknown, context?: string): void {
    void this.write('warn', message, context);
  }
  debug(message: unknown, context?: string): void {
    void this.write('debug', message, context);
  }
  verbose(message: unknown, context?: string): void {
    void this.write('verbose', message, context);
  }
}

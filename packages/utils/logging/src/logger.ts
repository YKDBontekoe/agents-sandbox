export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LoggerOptions {
  level?: LogLevel;
}

export class Logger {
  private level: LogLevel;

  constructor(opts: LoggerOptions = {}) {
    this.level = opts.level ?? 'info';
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }

  private shouldLog(level: LogLevel) {
    return levelOrder[level] >= levelOrder[this.level];
  }

  debug(...args: unknown[]) {
    if (this.shouldLog('debug')) console.debug(...args);
  }

  info(...args: unknown[]) {
    if (this.shouldLog('info')) console.info(...args);
  }

  warn(...args: unknown[]) {
    if (this.shouldLog('warn')) console.warn(...args);
  }

  error(...args: unknown[]) {
    if (this.shouldLog('error')) console.error(...args);
  }
}

export function createLogger(opts?: LoggerOptions) {
  return new Logger(opts);
}

import { getLogger as getLogTapeLogger } from "@logtape/logtape";

export class Logger {
  private logger: ReturnType<typeof getLogTapeLogger>;

  constructor(category: string) {
    this.logger = getLogTapeLogger(category);
  }

  info(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    this.logger.info(message);
  }

  debug(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    this.logger.debug(message);
  }

  warn(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    this.logger.warn(message);
  }

  error(...args: unknown[]): void {
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    this.logger.error(message);
  }
}

export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn", 
  ERROR: "error"
} as const; 

/**
 * Custom logger for Firebase Cloud Functions
 */

export enum LogLevel {
	DEBUG = "DEBUG",
	INFO = "INFO",
	WARN = "WARN",
	ERROR = "ERROR",
}

interface LogEntry {
	timestamp: string
	level: LogLevel
	message: string
	data?: any
}

class Logger {
  private formatLog(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data && {data}),
    };
  }

  debug(message: string, data?: any): void {
    const log = this.formatLog(LogLevel.DEBUG, message, data);
    console.debug(JSON.stringify(log));
  }

  info(message: string, data?: any): void {
    const log = this.formatLog(LogLevel.INFO, message, data);
    console.info(JSON.stringify(log));
  }

  warn(message: string, data?: any): void {
    const log = this.formatLog(LogLevel.WARN, message, data);
    console.warn(JSON.stringify(log));
  }

  error(message: string, error?: any): void {
    const log = this.formatLog(LogLevel.ERROR, message, {
      error: error?.message || error,
      stack: error?.stack,
    });
    console.error(JSON.stringify(log));
  }

  // Function-specific logger
  functionStart(functionName: string, data?: any): void {
    this.info(`Function started: ${functionName}`, data);
  }

  functionEnd(functionName: string, duration?: number): void {
    this.info(`Function completed: ${functionName}`, {duration});
  }

  functionError(functionName: string, error: any): void {
    this.error(`Function error: ${functionName}`, error);
  }
}

export const logger = new Logger();

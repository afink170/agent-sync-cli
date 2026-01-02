import { Logger as BaseLogger, Spinner } from '@node-cli/logger';

export interface LoggingOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export class Logger extends BaseLogger {
  static dryRun = false;
  static verbose = false;

  constructor(prefix?: string) {
    super({
      prefix,
      boring: false,
      timestamp: false,
    });
  }

  static configure(options: LoggingOptions) {
    const { dryRun, verbose } = options;
    Logger.dryRun = dryRun ?? Logger.dryRun;
    Logger.verbose = verbose ?? Logger.verbose;
  }

  get dryRun() {
    return Logger.dryRun;
  }

  get verbose() {
    return Logger.verbose;
  }

  debug(...arguments_: Array<unknown>): void {
    if (this.verbose) {
      super.debug(...arguments_);
    }
  }

  info(...arguments_: Array<unknown>): void {
    super.info(...arguments_);
  }

  warn(...arguments_: Array<unknown>): void {
    super.warn(...arguments_);
  }

  error(...arguments_: Array<unknown>): void {
    super.error(...arguments_);
  }

  action(...arguments_: Array<unknown>): void {
    if (this.dryRun) {
      this.info('[DRY RUN]', ...arguments_);
    } else {
      this.info(...arguments_);
    }
  }

  withLoadingSpinner<T>(operation: (spinner: Spinner) => T): T {
    const spinner = new Spinner();
    spinner.start();
    const stopSpinner = spinner.stop.bind(spinner);
    try {
      const result = operation(spinner);
      if (result instanceof Promise) {
        return result.finally(stopSpinner) as T;
      }
      return result;
    } catch (error) {
      stopSpinner();
      throw error;
    }
  }
}

export const logger = new Logger();

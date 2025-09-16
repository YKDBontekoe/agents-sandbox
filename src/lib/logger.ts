import log from 'loglevel';
import { config } from '@/infrastructure/config';

const logger = log.getLogger('arcane-dominion');

const level = config.logLevel as log.LogLevelDesc;

logger.setLevel(level);

// Enhanced logger that also outputs to server console in development
const shouldMirrorToConsole = () =>
  config.nodeEnv === 'development' && typeof window === 'undefined';

const enhancedLogger = {
  debug: (message: string, ...args: unknown[]) => {
    logger.debug(message, ...args);
    if (shouldMirrorToConsole()) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: unknown[]) => {
    logger.info(message, ...args);
    if (shouldMirrorToConsole()) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    logger.warn(message, ...args);
    if (shouldMirrorToConsole()) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    logger.error(message, ...args);
    if (shouldMirrorToConsole()) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
};

export default enhancedLogger;

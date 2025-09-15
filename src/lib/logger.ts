import log from 'loglevel';
import { config } from '@/infrastructure/config';

const logger = log.getLogger('arcane-dominion');

const level = config.logLevel as log.LogLevelDesc;

logger.setLevel(level);

// Enhanced logger that also outputs to server console in development
const enhancedLogger = {
  debug: (message: string, ...args: any[]) => {
    logger.debug(message, ...args);
    if (config.nodeEnv === 'development' && typeof window === 'undefined') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },
  info: (message: string, ...args: any[]) => {
    logger.info(message, ...args);
    if (config.nodeEnv === 'development' && typeof window === 'undefined') {
      console.log(`[INFO] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    logger.warn(message, ...args);
    if (config.nodeEnv === 'development' && typeof window === 'undefined') {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    logger.error(message, ...args);
    if (config.nodeEnv === 'development' && typeof window === 'undefined') {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }
};

export default enhancedLogger;

import log from "loglevel";
import { config } from "@/infrastructure/config";

const logger = log.getLogger("arcane-dominion");

const level = config.logLevel as log.LogLevelDesc;

logger.setLevel(level);

const toLevelNumber = (levelDesc: log.LogLevelDesc): log.LogLevelNumbers => {
  if (typeof levelDesc === "number") {
    return levelDesc as log.LogLevelNumbers;
  }

  const levelName = levelDesc.toString().toUpperCase();
  const levelKey = levelName as keyof log.LogLevel;

  if (levelKey in logger.levels) {
    const resolved = logger.levels[levelKey];
    if (typeof resolved === "number") {
      return resolved as log.LogLevelNumbers;
    }
  }

  const numericValue = Number(levelDesc);
  if (Number.isFinite(numericValue)) {
    const clamped = Math.min(
      Math.max(numericValue, logger.levels.TRACE),
      logger.levels.SILENT,
    );
    return clamped as log.LogLevelNumbers;
  }

  return logger.levels.SILENT as log.LogLevelNumbers;
};

const isLevelEnabled = (levelDesc: log.LogLevelDesc): boolean => {
  const currentLevel = logger.getLevel();
  const targetLevel = toLevelNumber(levelDesc);
  return currentLevel <= targetLevel;
};

// Enhanced logger that also outputs to server console in development
const shouldMirrorToConsole = () =>
  config.nodeEnv === "development" && typeof window === "undefined";

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
  },
  isLevelEnabled,
};

export default enhancedLogger;

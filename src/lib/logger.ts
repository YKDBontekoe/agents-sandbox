import log from 'loglevel';

const logger = log.getLogger('arcane-dominion');

const level = (process.env.NEXT_PUBLIC_LOG_LEVEL as log.LogLevelDesc) ||
  (process.env.NODE_ENV === 'development' ? 'debug' : 'error');

logger.setLevel(level);

export default logger;

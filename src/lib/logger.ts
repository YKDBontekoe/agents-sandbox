import log from 'loglevel';
import { config } from '@infrastructure/config';

const logger = log.getLogger('arcane-dominion');

const level = config.logLevel as log.LogLevelDesc;

logger.setLevel(level);

export default logger;

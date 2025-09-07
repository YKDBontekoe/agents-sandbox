import { createLogger, LogLevel } from '@logging';
import { config } from '@/infrastructure/config';

export const logger = createLogger({ level: config.logLevel as LogLevel });
export default logger;

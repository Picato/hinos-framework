import { getLogger } from 'log4js'

const logger = getLogger()
logger.level = 'all'
logger.level = 'debug';
logger.debug("Some debug messages");
export default logger

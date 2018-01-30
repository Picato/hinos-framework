import { getLogger, configure } from 'log4js'

const logger = getLogger()
logger.level = 'all'
export default logger

export const config = configure

const logger = require('./logger');
const fileIO = require('./fileIO');
const math = require('./math');
const utility = require('./utility');
const fastifyResponse = require('./fastifyResponse');

module.exports = {
    logger,
    ...fileIO,
    ...math,
    ...utility,
    ...fastifyResponse
}
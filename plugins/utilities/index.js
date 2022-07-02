const logger = require('./logger');
const fileIO = require('./fileIO');
const math = require('./math');
const utility = require('./utility');
const response = require('./response');
const fastifyResponse = require('./fastifyResponse');
const aeFunctionLibrary = require('./aeFunctionLibrary');

module.exports = {
    logger,
    ...fileIO,
    ...math,
    ...utility,
    ...response,
    ...fastifyResponse,
    ...aeFunctionLibrary
}
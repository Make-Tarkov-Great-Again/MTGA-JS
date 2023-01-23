const fileIO = require('./fileIO');
const math = require('./math');
const utility = require('./utility');
const response = require('./response');
const pino = require('./pino');

module.exports = {
    ...fileIO,
    ...math,
    ...utility,
    ...response,
    ...pino
}
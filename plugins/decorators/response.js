const fp = require("fastify-plugin")
const {
    noBody,
    getBody,
    getUnclearedBody,
    nullResponse,
    emptyArrayResponse,
    clearString
} = require("./../utilities/response");

/**
 * Set response decorators for fastify instance.
 * @param {*} app Fastify instance
 * @param {*} opts Plugin options
 */
async function response(app, options) {
    await app.decorateReply("noBody", noBody);
    await app.decorateReply("getBody", getBody);
    await app.decorateReply("getUnclearedBody", getUnclearedBody);
    await app.decorateReply("nullResponse", nullResponse);
    await app.decorateReply("emptyArrayResponse", emptyArrayResponse);
    await app.decorate("clearString", clearString);
};
module.exports = fp(response);
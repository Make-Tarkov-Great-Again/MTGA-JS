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
    app.decorateReply("noBody", noBody);
    app.decorateReply("getBody", getBody);
    app.decorateReply("getUnclearedBody", getUnclearedBody);
    app.decorateReply("nullResponse", nullResponse);
    app.decorateReply("emptyArrayResponse", emptyArrayResponse);
    app.decorate("clearString", clearString);
};
module.exports = fp(response);
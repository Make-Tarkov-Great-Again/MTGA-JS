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
    app.log.info("Decorated noBody");
    
    await app.decorateReply("getBody", getBody);
    app.log.info("Decorated getBody");

    await app.decorateReply("getUnclearedBody", getUnclearedBody);
    app.log.info("Decorated getUnclearedBody");

    await app.decorateReply("nullResponse", nullResponse);
    app.log.info("Decorated nullResponse");

    await app.decorateReply("emptyArrayResponse", emptyArrayResponse);
    app.log.info("Decorated emptyArrayResponse");

    await app.decorate("clearString", clearString);
    app.log.info("Decorated clearString");
};
module.exports = fp(response);
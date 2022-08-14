const { logger, FastifyResponse } = require("../../utilities");

module.exports = async function matchRoutes(app, _opts) {

    app.post(`/client/match/offline/start`, async (request, reply) => {
        logger.logConsole(`[match/offline/start] : ${request.body}`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post(`/client/match/offline/end`, async (request, reply) => {
        logger.logConsole(`[match/offline/end] : ${request.body}`)
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post("/client/match/available", async (request, reply) => {
        logger.logConsole(`[match/available] : ${request.body}`);
        logger.logDebug("Match available not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(true)
        );
    });

    app.post(`/client/match/join`, async (request, reply) => {
        logger.logConsole(`[match/join] : ${request.body}`);
        logger.logDebug("Match join not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null)
        );
    });
    
};

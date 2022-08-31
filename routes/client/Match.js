const { GameController } = require("../../lib/controllers");
const { logger, FastifyResponse } = require("../../utilities");

module.exports = async function matchRoutes(app, _opts) {

    app.post(`/client/match/offline/start`, async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post(`/client/match/offline/end`, async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post("/client/match/available", async (request, reply) => {
        logger.console(`[match/available (NOT IMPLEMENTED)] : ${request.body}`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(true)
        );
    });

    app.post(`/client/match/join`, async (request, reply) => {
        logger.console(`[match/join (NOT IMPLEMENTED)] : ${request.body}`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null)
        );
    });

};

const { GameController } = require("../../lib/controllers");
const { logger, Response } = require("../../utilities");

module.exports = async function matchRoutes(app, _opts) {

    app.post(`/client/match/offline/start`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null, 0, null)
        );
    });

    app.post(`/client/match/offline/end`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null, 0, null)
        );
    });

    app.post("/client/match/available", async (request, reply) => {
        logger.debug(`[match/available (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(true)
        );
    });

    app.post(`/client/match/join`, async (request, reply) => {
        logger.debug(`[match/join (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

};

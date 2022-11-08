const { GameController } = require("../../lib/controllers");
const { logger, Response } = require("../../utilities");

module.exports = async function matchRoutes(app, _opts) {

    app.post(`/client/match/offline/start`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null, 0, null)
        );
    });

    app.post(`/client/match/updatePing`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    })

    app.post(`/client/putMetrics`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    })

    app.post(`/client/getMetricsConfig`, async (request, reply) => {
        const { database: { core: { metrics } } } = require(`../../app`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(metrics)
        );
    })

    app.post(`/client/match/exit`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    })

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

    app.post(`/client/match/group/create`, async (request, reply) => {
        logger.debug(`[match/group/create (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/leave`, async (request, reply) => {
        logger.debug(`[match/group/leave (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/delete`, async (request, reply) => {
        logger.debug(`[match/group/delete (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/exit_from_menu`, async (request, reply) => {
        logger.debug(`[match/group/exit_from_menu (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/invite/send`, async (request, reply) => {
        logger.debug(`[match/group/invite/send (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/invite/cancel`, async (request, reply) => {
        logger.debug(`[match/group/invite/cancel (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/invite/accept`, async (request, reply) => {
        logger.debug(`[match/group/invite/accept (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(null)
        );
    });

    app.post(`/client/match/group/status`, async (request, reply) => {
        logger.debug(`[match/group/status (NOT IMPLEMENTED)] : ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                players: []
            })
        );
    });
};

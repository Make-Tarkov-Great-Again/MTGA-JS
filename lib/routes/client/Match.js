const { logger, Response, stringify } = require("../../utilities");
const { database: { core: { metrics } } } = require(`../../../app`);


module.exports = async function matchRoutes(app, _opts) {

    app.post(`/client/match/updatePing`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    })

    app.post(`/client/putMetrics`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    })

    app.post(`/client/getMetricsConfig`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(metrics)
        );
    })

    app.post(`/client/match/exit`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    })

    app.post(`/client/match/offline/end`, async (request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post("/client/match/available", async (request, reply) => {
        logger.warn(`[match/available (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(true)
        );
    });

    app.post(`/client/match/join`, async (request, reply) => {
        logger.warn(`[match/join (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/create`, async (request, reply) => {
        logger.warn(`[match/group/create (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/leave`, async (request, reply) => {
        logger.warn(`[match/group/leave (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/delete`, async (request, reply) => {
        logger.warn(`[match/group/delete (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/exit_from_menu`, async (request, reply) => {
        logger.warn(`[match/group/exit_from_menu (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/invite/send`, async (request, reply) => {
        logger.warn(`[match/group/invite/send (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/invite/cancel`, async (request, reply) => {
        logger.warn(`[match/group/invite/cancel (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/invite/accept`, async (request, reply) => {
        logger.warn(`[match/group/invite/accept (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/status`, async (request, reply) => {
        logger.warn(`[match/group/status (NOT IMPLEMENTED)] : ${stringify(request.body)}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                players: []
            })
        );
    });
};

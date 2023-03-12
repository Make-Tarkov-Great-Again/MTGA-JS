import { RichPresenseController } from "../../controllers/RichPresenseController.mjs";
import { logger, Response, stringify } from "../../utilities/_index.mjs";

export default async function matchRoutes(app, _opts) {


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
        const { metrics } = app.database.core;

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
        logger.warn(`[match/available] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(false)
        );
    });

    app.post(`/client/match/join`, async (request, reply) => {
        logger.warn(`[match/join] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/current`, async (request, reply) => {
        const sessionID = Response.getSessionID(request);
        
        await RichPresenseController.OnMainMenu(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                squad: [],
                raidSettings: {}
            })
        )
    })

    app.post(`/client/match/group/create`, async (request, reply) => {
        logger.warn(`[match/group/create] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/leave`, async (request, reply) => {
        logger.warn(`[match/group/leave] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/delete`, async (request, reply) => {
        logger.warn(`[match/group/delete] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/exit_from_menu`, async (request, reply) => {
        logger.warn(`[match/group/exit_from_menu] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("object")
        );
    });

    app.post(`/client/match/group/invite/send`, async (request, reply) => {
        logger.warn(`[match/group/invite/send] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/invite/cancel`, async (request, reply) => {
        logger.warn(`[match/group/invite/cancel] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/invite/cancel-all`, async (request, reply) => {
        logger.warn(`[/client/match/group/invite/cancel-all] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("object")
        );
    });

    app.post(`/client/match/group/invite/accept`, async (request, reply) => {
        logger.warn(`[match/group/invite/accept] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    });

    app.post(`/client/match/group/status`, async (request, reply) => {
        logger.warn(`[match/group/status] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                players: [{}, {}],
                invite: [],
                group: []
            })
        );
    });

    app.post(`/client/match/raid/ready`, async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("object")
        );
    });

    app.post(`/client/match/raid/not-ready`, async (request, reply) => {
        logger.warn(`[/client/match/raid/not-ready] ${request.body}`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("object")
        );
    });
};

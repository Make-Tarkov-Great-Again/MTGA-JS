const { Language } = require('../models/Language');
const { Trader } = require('../models/Trader');

const { TaskerController } = require("./TaskerController");

const { getCurrentTimestamp, logger, Response } = require("../../utilities");


class GameController {

    static async clientGameStart(_request, reply) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(
                { utc_time: await getCurrentTimestamp() },
            )
        );
    }

    static async clientGameVersionValidate(request, reply) {
        logger.info("Client connected with version: " + request.body.version.major);
        return Response.zlibJsonReply
            (
                reply,
                Response.applyBody(null)
            );
    }

    static async clientGameConfig(request, reply) {
        const sessionID = await Response.getSessionID(request);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                aid: sessionID,
                lang: "en",
                languages: await Language.getAllWithoutKeys(),
                ndaFree: false,
                taxonomy: 6,
                activeProfileId: `pmc${sessionID}`,
                backend: {
                    Trading: Response.getBackendUrl(),
                    Messaging: Response.getBackendUrl(),
                    Main: Response.getBackendUrl(),
                    RagFair: Response.getBackendUrl()
                },
                utc_time: await getCurrentTimestamp(),
                totalInGame: 0,
                reportAvailable: true,
                twitchEventMember: false
            })
        );
    }

    static async clientGameKeepAlive(request, reply) {
        const sessionID = await Response.getSessionID(request);

        // traders assorts
        const traders = await Trader.getAllWithoutKeys();
        const currentTime = await getCurrentTimestamp();
        for (const trader of traders) {
            await trader.generateAssort(currentTime);
        }

        await TaskerController.runTasks(sessionID);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(
                {
                    msg: "OK",
                    utc_time: currentTime
                })
        );
    }
}
module.exports.GameController = GameController;

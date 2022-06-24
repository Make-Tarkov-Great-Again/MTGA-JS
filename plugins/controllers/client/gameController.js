const { database } = require("../../../app");
const { profile } = require("../../models");
const { getCurrentTimestamp, logger, fastifyResponse } = require("../../utilities");


class GameController {
    
    // JET Basics //
    static modeOfflinePatches = async (_request = null, reply = null) => {
        await fastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (_request = null, reply = null) => {
        await fastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes)
    }
    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = profile.get(await fastifyResponse.getSessionID(request));
        if (playerProfile) {
            await fastifyResponse.zlibJsonReply
                (
                    reply,
                    fastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            0,
                            null
                        )
                )
        } else {
            await fastifyResponse.zlibJsonReply
                (
                    reply,
                    fastifyResponse.applyBody
                        (
                            { utc_time: Date.now() / 1000 },
                            999,
                            "Profile Not Found!!"
                        )
                )
        }
    }

    static clientGameVersionValidate = async (request = null, reply = null) => {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        await fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(null)
            );
    };

    static clientGameConfig = async (request = null, reply = null) => {
        const sessionID = await fastifyResponse.getSessionID(request);
        const responseObject = {
            queued: false,
            banTime: 0,
            hash: "BAN0",
            lang: "en",
            ndaFree: false,
            reportAvailable: true,
            languages: database.languages,
            aid: sessionID,
            token: sessionID,
            taxonomy: 6,
            activeProfileId: "pmc" + sessionID,
            nickname: "user",
            backend: {
                Trading: fastifyResponse.getBackendURL(),
                Messaging: fastifyResponse.getBackendURL(),
                Main: fastifyResponse.getBackendURL(),
                RagFair: fastifyResponse.getBackendURL()
            },
            totalInGame: 0,
            utc_time: getCurrentTimestamp()
        };

        await fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(responseObject)
            );
    };
}

module.exports.GameController = GameController;
const { database } = require("../../../app");
const { Profile } = require("../../models");
const { getCurrentTimestamp, logger, FastifyResponse } = require("../../utilities");


class GameController {
    // JET Basics //
    static modeOfflinePatches = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes)
    }
    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody
                (
                    { utc_time: Date.now() / 1000 },
                    0,
                    null
                )
            )
        } else {
            return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody
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
        await FastifyResponse.zlibJsonReply
        (
            reply,
            FastifyResponse.applyBody(null)
        );
    };

    static clientGameConfig = async (request = null, reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
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
                Trading: FastifyResponse.getBackendURL(),
                Messaging: FastifyResponse.getBackendURL(),
                Main: FastifyResponse.getBackendURL(),
                RagFair: FastifyResponse.getBackendURL()
            },
            totalInGame: 0,
            utc_time: getCurrentTimestamp()
        };

        await FastifyResponse.zlibJsonReply
        (
            reply,
            FastifyResponse.applyBody(responseObject)
        );
    };
}

module.exports.GameController = GameController;
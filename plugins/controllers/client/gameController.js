const { database } = require("../../../app");
const { Profile, Language, Account } = require("../../models");
const { getCurrentTimestamp, logger, FastifyResponse } = require("../../utilities");


class GameController {
    // JET Basics //
    static modeOfflinePatches = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (_request = null, reply = null) => {
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
            languages: await Language.getAllWithoutKeys(),
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

    static clientGameKeepAlive = async (request = null, _reply = null) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        if (typeof sessionID == "undefined") return FastifyResponse.applyBody({
            msg: "No Session",
            utc_time: getCurrentTimestamp(),
        });
        return FastifyResponse.applyBody({ msg: "OK", utc_time: getCurrentTimestamp() });
    }

    static clientProfileList = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(profile.character)
        )
    }

    static clientGameProfileNicknameReserved = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody("")
        )
    }

    static clientGameProfileNicknameValidate = async (request = null, reply = null) => {
        const validate = await Account.ifAvailableNickname(request.body.nickname);
        const response = database.core.serverConfig.translations

        if (validate === true) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ status: "OK" })
            )
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(null, 255, response.alreadyInUse)
            )
        }
    }
}
module.exports.GameController = GameController;
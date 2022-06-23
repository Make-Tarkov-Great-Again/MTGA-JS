const { database } = require("../../../app");
const { profile } = require("../../models/profile");
const { getSessionID, getBody } = require("../../utilities");
const { fastifyResponse } = require("../../utilities/fastifyResponse");
const logger = require("../../utilities/logger");

/**
 * This is an example controller with a basic callset.
 */
class gameController {
    constructor() {
    }

    // JET Basics //
    static modeOfflinePatches = async (request = null, reply = null) => {
        return await fastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (request = null, reply = null) => {
        return await fastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes)
    }

    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = profile.get(await getSessionID(request));
        if (playerProfile) {
            return await fastifyResponse.zlibJsonReply
                (
                    reply,
                    fastifyResponse.applyBody
                    (
                        {utc_time: Date.now() / 1000},
                        0,
                        null
                    )
                )
        } else {
            return await fastifyResponse.zlibJsonReply
            (
                reply, 
                fastifyResponse.applyBody
                (
                    {utc_time: Date.now() / 1000}, 
                    999, 
                    "Profile Not Found!!"
                )
            )
        }
    }
}

module.exports.gameController = gameController;
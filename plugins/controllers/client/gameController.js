const { database } = require("../../../app");
const { profile } = require("../../models/profile");
const { getSessionID, getBody } = require("../../utilities");
const logger = require("../../utilities/logger");

/**
 * This is an example controller with a basic callset.
 */
class gameController { 
    constructor() {
    }

    // JET Basics //
    static modeOfflinePatches = async (request = null, reply = null) => {
        reply
            .type("application/json")
            .compress(database.core.serverConfig.Patches);
    }

    static modeOfflinePatchNodes = async (request = null, reply = null) => {
        reply
            .type("application/json")
            .compress(database.core.serverConfig.PatchNodes)
    }

    // Game //

    static clientGameStart = async (request = null, reply = null) => {
        let playerProfile = profile.get(await getSessionID(request));
        if (playerProfile) {
            reply
                .type("application/json")
                .compress(getBody({ utc_time: Date.now() / 1000 }, 0, null))
        } else {
            reply
                .type("application/json")
                .compress(getBody({ utc_time: Date.now() / 1000 }, 999, "Profile Not sadas!!"))
        }
    }
}

module.exports.gameController = gameController;
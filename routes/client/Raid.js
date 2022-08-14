const { logger, stringify, FastifyResponse } = require("../../utilities");
const { Profile } = require("../../lib/models/Profile");

module.exports = async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, _reply) => {
        if (typeof request.body === "undefined") {
            logger.logDebug("/client/raid/person/killed/showMessage", "No killedByAID provided");
            return stringify({}); //this pops on start for some reason
        }

        const { database } = require("../../app");
        const sessionID = await FastifyResponse.getSessionID(request)
        
        const fence = database.core.gameplay.fence;
        const killScavChange = fence.killingScavsFenceLevelChange;
        const killPmcChange = fence.killingPMCsFenceLevelChange;

        // if the killer is the player
        if (request.body.killedByAID === sessionID) {
            const account = await Profile.get(sessionID);
            const profile = await account.getPmc();

            if (request.body.diedFaction === "Savage" || request.body.diedFaction === "Scav")
                profile.TradersInfo["579dc571d53a0658a154fbec"].standing += killScavChange;
            else if (request.body.diedFaction === "Usec" || request.body.diedFaction === "Bear")
                profile.TradersInfo["579dc571d53a0658a154fbec"].standing += killPmcChange;

            //await profile.save();
        }
        return stringify({});
    });

    app.post(`/client/raid/person/killed`, async (request, _reply) => {
        const { database } = require("../../app");
        const showMessage = database.core.gameplay.inRaid.showDeathMessage;

        if (showMessage) {
            return stringify(showMessage)
        } else return stringify(false);
    });

    app.post(`/client/raid/createFriendlyAI`, async (request, _reply) => {
        const { database } = require("../../app");
        const createFriendlyAI = database.core.gameplay.inRaid.createFriendlyAI;

        if (createFriendlyAI) {
            return stringify(createFriendlyAI)
        } else return stringify(false);
    });

    app.post(`/client/raid/bots/getNewProfile`, async (request, _reply) => {
        return stringify({});
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, _reply) => {
        return stringify("")
    });
    
}
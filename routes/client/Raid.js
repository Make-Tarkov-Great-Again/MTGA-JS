const { logger, stringify, Response } = require("../../utilities");
const { Profile } = require("../../lib/models/Profile");
const { database: { core: { gameplay: {
    trading: { fence: { killingPMCsFenceLevelChange, killingScavsFenceLevelChange } }, raid: { inRaid: { createFriendlyAI, showDeathMessage } } } } } } = require("../../app");

module.exports = async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, _reply) => {
        logger.info(`[KILL INFO] ${stringify(request.body)}`)
        return stringify(showDeathMessage);
    });

    app.post(`/client/raid/person/killed`, async (request, _reply) => {
        const sessionID = await Response.getSessionID(request)

        // if the killer is the player
        if (request.body.killedByAID === sessionID) {
            const playerProfile = await Profile.get(sessionID);

            if (request.body.diedFaction === "Savage" || request.body.diedFaction === "Scav")
                playerProfile.character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingScavsFenceLevelChange;
            else if (request.body.diedFaction === "Usec" || request.body.diedFaction === "Bear")
                playerProfile.character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingPMCsFenceLevelChange;

            await playerProfile.saveCharacter();
        }
        return stringify({});
    });

    app.post(`/client/raid/createFriendlyAI`, async (_request, _reply) => {
        return stringify(createFriendlyAI);
    });

    app.post(`/client/raid/bots/getNewProfile`, async (_request, _reply) => {
        return stringify({});
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, _reply) => {
        logger.info(stringify(request.body));
        return stringify("");
    });

}
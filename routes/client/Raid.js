const { logger, stringify, FastifyResponse } = require("../../utilities");
const { Profile } = require("../../lib/models/Profile");

module.exports = async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, _reply) => {
        if (typeof request.body === "undefined") {
            return stringify({}); //this pops on start for some reason
        }

        const { database: { core: { gameplay: { trading: { fence: { killingScavsFenceLevelChange, killingPMCsFenceLevelChange } } } } } } = require("../../app");
        const sessionID = await FastifyResponse.getSessionID(request)

        // if the killer is the player
        if (request.body.killedByAID === sessionID) {
            const { character } = await Profile.get(sessionID);

            if (request.body.diedFaction === "Savage" || request.body.diedFaction === "Scav")
                character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingScavsFenceLevelChange;
            else if (request.body.diedFaction === "Usec" || request.body.diedFaction === "Bear")
                character.TradersInfo["579dc571d53a0658a154fbec"].standing += killingPMCsFenceLevelChange;

            await account.save();
        }
        return stringify({});
    });

    app.post(`/client/raid/person/killed`, async (request, _reply) => {
        const { database: { core: { gameplay: {
            raid: { inRaid: { showDeathMessage } } } } } } = require("../../app");

        if (showDeathMessage) {
            return stringify(showDeathMessage)
        } else return stringify(false);
    });

    app.post(`/client/raid/createFriendlyAI`, async (request, _reply) => {
        const { database: { core: { gameplay: {
            raid: { inRaid: { createFriendlyAI } } } } } } = require("../../app");
        if (createFriendlyAI) {
            return stringify(createFriendlyAI)
        } else return stringify(false);
    });

    app.post(`/client/raid/bots/getNewProfile`, async (request, _reply) => {
        return stringify({});
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, _reply) => {
        return stringify("");
    });

}
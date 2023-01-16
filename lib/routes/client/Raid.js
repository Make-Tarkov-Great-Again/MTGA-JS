const { logger, stringify, Response } = require("../../utilities");
const { Profile } = require("../../models/Profile");
const { Bot } = require("../../models/Bot");
const { RaidController } = require("../../controllers/RaidController");

const { database: { core: { gameplay: {
    bots: { preload: { enabled } },
    trading: { fence: { killingPMCsFenceLevelChange, killingScavsFenceLevelChange } },
    raid: { inRaid: { createFriendlyAI, showDeathMessage } } } } } } = require("../../../app");

module.exports = async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, reply) => {
        return Response.zlibJsonReply(reply, showDeathMessage);
    });

    app.post(`/client/raid/configuration`, async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            { err: 0 });
    });

    app.post(`/client/raid/person/killed`, async (request, reply) => {
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
        return Response.zlibJsonReply(reply, {});
    });

    app.post(`/client/raid/createFriendlyAI`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, createFriendlyAI);
    });

    app.post(`/client/raid/bots/getNewProfile`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, {});
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, reply) => {
        logger.info(stringify(request.body));
        return Response.zlibJsonReply(reply, "");
    });

    app.post(`/client/raid/profile/save`, async (request, reply) => {
        await RaidController.raidProfileSave(request, reply);
        if (enabled)
            await Bot.regeneratePreloadedBots();
    });

}
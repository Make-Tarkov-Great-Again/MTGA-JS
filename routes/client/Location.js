const { LocationController } = require("../../lib/controllers");
const { Bot } = require("../../lib/models/Bot");

const { logger, writeFile, Response } = require("../../utilities");

module.exports = async function locationRoutes(app, _opts) {

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        await LocationController.clientLocationGetLocalloot(request, reply);
    });

    app.post('/client/game/bot/generate', async (request, reply) => {
        const bots = await Bot.generateBots(request, reply);
        writeFile("./generatedBots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(bots)
        );
    });

    app.get(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        logger.debug("[getAirdropLoot] loot generation not implemented");
        return Response.zlibJsonReply(reply, result);
    });

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        const { database: { bot: { core, bots } } } = require("../app");
        const keys = request.params['*'].split("/");

        if (keys[0] in bots) {
            if (keys[1] in bots[keys[0]].difficulty) {
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody(bots[keys[0]].difficulty[keys[1]])
                );
            }
        } else {
            logger.error(`Bot: ${keys[0]} does not have a difficulty: ${keys[1]}`);
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(core)
            );
        }
    });

    app.get(`/singleplayer/settings/raid/menu`, async (_request, reply) => {
        const { database: { core: { gameplay: {
            raid: { defaultRaidSettings } } } } } = require("../app");

        return Response.zlibJsonReply(reply, defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (_request, reply) => {
        const { database: { core: { gameplay: {
            raid: { airdropSettings } } } } } = require("../app");

        return Response.zlibJsonReply(reply, airdropSettings);
    });
};

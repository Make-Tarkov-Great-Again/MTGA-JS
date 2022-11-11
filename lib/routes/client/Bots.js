const { Bot } = require("../../models/Bot");
const { logger, Response, writeFile, stringify } = require("../../utilities");
const { database: { core: { gameplay: {
    development: { debugBots },
    bots: { preload } } } } } = require("../../../app");

module.exports = async function botRoutes(app, _opts) {
    app.post('/client/game/bot/generate', async (request, reply) => {
        const bots = preload.enabled ? await Bot.usePreloadedBots(request) : await Bot.generateBots(request);
        if (debugBots)
            await writeFile("./generatedbots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(bots)
        );
    });

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        const { database: { bot: { core, bots } } } = require("../../../app");
        const keys = request.params['*'].split("/");

        if (keys[0] in bots) {
            if (keys[1] in bots[keys[0]].difficulty) {
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(bots[keys[0]].difficulty[keys[1]])
                );
            }
        } else {
            await logger.error(`Bot: ${keys[0]} does not have a difficulty: ${keys[1]}`);
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(core)
            );
        }
    });
}
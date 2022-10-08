const { Bot } = require("../../lib/models/Bot");
const { logger, Response } = require("../../utilities");

module.exports = async function botRoutes(app, _opts) {
    app.post('/client/game/bot/generate', async (request, reply) => {
        const { database: { core: { gameplay: { bots: { preload } } } } } = require("../../app");     
        const bots = preload ? await Bot.usePreloadedBots(request, reply) : await Bot.generateBots(request, reply);
        
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(bots)
        );
    });

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        const { database: { bot: { core, bots } } } = require("../../app");
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
}
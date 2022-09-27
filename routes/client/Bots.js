const { Bot } = require("../../lib/models/Bot");
const { logger, writeFile, Response } = require("../../utilities");

module.exports = async function botRoutes(app, _opts) {
    app.post('/client/game/bot/generate', async (request, reply) => {
        const bots = await Bot.generateBots(request, reply);
        writeFile("./generatedBots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(bots)
        );
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
}
const { logger, FastifyResponse } = require("../utilities");

module.exports = async function singleplayerRoutes(app, _opts) {

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        const { database } = require("../app");
        const keys = request.params['*'].split("/");

        if (keys[0] in database.bot.bots) {
            if (keys[1] in database.bot.bots[keys[0]].difficulty) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(database.bot.bots[keys[0]].difficulty[keys[1]])
                );
            }
        } else {
            logger.logError(`Bot: ${keys[0]} does not have a difficulty: ${keys[1]}`);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.bot.core)
            );
        }
    });

    app.get(`/singleplayer/settings/raid/menu`, async (_request, reply) => {
        const { database } = require("../app");

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.gameplay.defaultRaidSettings)
        );
    });
}
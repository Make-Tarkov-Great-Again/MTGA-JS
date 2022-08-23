const { logger, FastifyResponse, stringify } = require("../utilities");

module.exports = async function singleplayerRoutes(app, _opts) {

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        const { database: { bot: { core, bots } } } = require("../app");
        const keys = request.params['*'].split("/");

        if (keys[0] in bots) {
            if (keys[1] in bots[keys[0]].difficulty) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(bots[keys[0]].difficulty[keys[1]])
                );
            }
        } else {
            logger.logError(`Bot: ${keys[0]} does not have a difficulty: ${keys[1]}`);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(core)
            );
        }
    });

    app.get(`/singleplayer/settings/raid/menu`, async (_request, reply) => {
        const { database: { core: { gameplay: { defaultRaidSettings } } } } = require("../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(defaultRaidSettings)
        );
    });

    app.get(`/singleplayer/airdrop/config`, async (_request, _reply) => {
        const { database: { core: { gameplay: { inRaid: { airdropSettings } } } } } = require("../app");
        return stringify(airdropSettings)
    });

}
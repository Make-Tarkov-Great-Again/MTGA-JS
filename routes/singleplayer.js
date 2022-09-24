const { logger, Response, stringify } = require("../utilities");

module.exports = async function singleplayerRoutes(app, _opts) {

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

        return stringify(defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (_request, _reply) => {
        const { database: { core: { gameplay: {
            raid: { airdropSettings } } } } } = require("../app");
        return stringify(airdropSettings, true);
    });

}
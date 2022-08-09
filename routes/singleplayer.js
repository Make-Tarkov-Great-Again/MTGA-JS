const { logger, FastifyResponse } = require("../utilities");

module.exports = async function singleplayerRoutes(app, _opts) {
    
    app.get(`/singleplayer/settings/bot/difficulty/:botInfo`, async (request, reply) => {
        const { database } = require('../../app')

        console.log(request.params['botInfo'])

        const keys = request.url.replace("/singleplayer/settings/bot/difficulty/", "").split("/");

        if (database.bot.bots.includes(keys[0])) {
            if (database.bots.bots[keys[0]].difficulties.includes(keys[1])) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(database.bots.bots[keys[0]].difficulties[keys[1]])
                );
            }
        }
    });

    app.get(`/singleplayer/settings/raid/menu`, async (request, reply) => {
        const { database } = require('../../app')

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.gameplay.defaultRaidSettings)
        );
    });
}
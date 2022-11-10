const { LocationController } = require("../../controllers");
const { logger, Response } = require("../../utilities");

module.exports = async function locationRoutes(app, _opts) {

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        await LocationController.clientLocationGetLocalloot(request, reply);
    });

    app.get(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        await logger.debug("[getAirdropLoot] loot generation not implemented");
        return Response.zlibJsonReply(reply, result);
    });

    app.get(`/singleplayer/settings/raid/menu`, async (_request, reply) => {
        const { database: { core: { gameplay: {
            raid: { defaultRaidSettings } } } } } = require("../../../app");

        defaultRaidSettings.bossEnabled = false;
        await logger.info(`[ENABLE BOSSES] set to False until generating Boss bots is working`);

        return Response.zlibJsonReply(reply, defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (_request, reply) => {
        const { database: { core: { gameplay: {
            raid: { airdropSettings } } } } } = require("../../../app");

        return Response.zlibJsonReply(reply, airdropSettings);
    });
};

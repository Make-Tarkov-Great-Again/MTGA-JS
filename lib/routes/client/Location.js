const { LocationController } = require("../../controllers");
const { logger, Response } = require("../../utilities");
const { database: { core: { gameplay: {
    raid: { defaultRaidSettings, airdropSettings } } } } } = require("../../../app");

module.exports = async function locationRoutes(app, _opts) {

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        await LocationController.clientLocationGetLocalloot(request, reply);
    });

    app.get(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        logger.warn("[getAirdropLoot] loot generation not implemented");
        return Response.zlibJsonReply(reply, result);
    });

    app.get(`/singleplayer/settings/raid/menu`, async (request, reply) => {
        return Response.zlibJsonReply(reply, defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (request, reply) => {
        return Response.zlibJsonReply(reply, airdropSettings);
    });

    app.get(`/test/location/loot`, async (request, reply) => {
        await LocationController.testData(request, reply);
    });
};

const { LocationController } = require("../../lib/controllers");
const { logger, stringify } = require("../../utilities");

module.exports = async function locationRoutes(app, _opts) {

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        await LocationController.clientLocationGetLocalloot(request, reply);
    });

    app.post(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        logger.debug("[getAirdropLoot] loot generation not implemented");
        return stringify(result);
    })
};

const { LocationController: { clientLocationGetLocalloot } } = require("../../lib/controllers");
const { logger, stringify, clearString } = require("../../utilities");

module.exports = async function locationRoutes(app, _opts) {

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        await clientLocationGetLocalloot(request, reply);
    });

    app.get(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        logger.debug("[getAirdropLoot] loot generation not implemented");
        return stringify(result);
    })
};

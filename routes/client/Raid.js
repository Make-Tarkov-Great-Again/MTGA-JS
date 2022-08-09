const { default: stringify } = require("fast-safe-stringify");
const { logger } = require("../../utilities");

module.exports = async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, reply) => {
        return logger.logDebug("Raid person killed show message not implemented yet");
    });

    app.post(`/client/raid/createFriendlyAI`, async (request, reply) => {
        return logger.logDebug("Raid create friendly AI not implemented yet");
    });

    app.post(`/client/raid/bots/getNewProfile`, async (request, reply) => {
        return logger.logDebug("Raid bots get new profile not implemented yet");
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, reply) => {
        console.log(request.body);
        return stringify("")
    });
}
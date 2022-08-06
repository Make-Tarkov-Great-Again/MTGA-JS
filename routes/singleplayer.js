const { logger, FastifyResponse } = require("../utilities");

module.exports = async function singleplayerRoutes(app, _opts) {
    app.get(`/singleplayer/settings/bot/difficulty`, async (request, reply) => {
        logger.logError(`singleplayer/settings/bot/difficulty not implemented`);
        return "your mom gay";
    });
}
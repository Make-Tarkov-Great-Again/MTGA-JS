const { gameController } = require("../controllers/client/gameController");
const { logger } = require("../utilities");

module.exports = async function gameRoutes(app, opts) {

    // Initial entry points for tarkov //

    app.get(`/mode/offline`, async (request, reply) => {
        return await gameController.modeOfflinePatches(request, reply);
    });

    app.get(`/mode/offlineNodes`, async (request, reply) => {
        return await gameController.modeOfflinePatchNodes(request, reply);
    });

    // Client Game Rotues //
    app.post(`/client/game/start`, async (request, reply) => {
        return await gameController.clientGameStart(request, reply);
    });
}
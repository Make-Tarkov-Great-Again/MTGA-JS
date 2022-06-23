const { gameController } = require("../controllers/client/gameController");
const { menuController } = require("../controllers/client/menuController");

const { logger } = require("../utilities");

module.exports = async function gameRoutes(app, opts) {

    // Initial entry points for tarkov //

    app.get(`/mode/offline`, async (request, reply) => {
        return await gameController.modeOfflinePatches(request, reply);
    });

    app.get(`/mode/offlineNodes`, async (request, reply) => {
        return await gameController.modeOfflinePatchNodes(request, reply);
    });

    // Client Game Routes //

    app.post(`/client/game/start`, async (request, reply) => {
        return await gameController.clientGameStart(request, reply);
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        return await gameController.clientGameVersionValidate(request, reply);
    });

    // Client Menu Routes //

    app.post(`/client/menu/locale/:language`, async (request, reply) => {
        return await menuController.clientMenuLocale(request, reply);
    });

    app.post(`/client/locale/:language`, async (request, reply) => {
        return await menuController.clientGlobalLocale(request, reply);
    })

    app.post(`/client/languages`, async (request, reply) => {
        return await menuController.clientGetLanguages(request, reply);
    });
    
}
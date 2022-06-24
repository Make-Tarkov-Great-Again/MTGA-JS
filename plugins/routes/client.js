const { clientController, gameController, menuController } = require("../controllers/client")
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

    app.post(`/client/game/config`, async (request, reply) => {
        return await gameController.clientGameConfig(request, reply);
    });

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
        return await menuController.clientLocale(request, reply);
    })

    // Ungrouped routes //

    app.post(`/client/customization`, async (request, reply) => {
        return await clientController.clientCustomization(request, reply);
    });

    app.post(`/client/items`, async (request, reply) => {
        return await clientController.clientItems(request, reply);
    });

    app.post(`/client/languages`, async (request, reply) => {
        return await clientController.clientLanguages(request, reply);
    });

    app.post(`/client/globals`, async (request, reply) => {
        return await clientController.clientGlobals(request, reply);
    })
}
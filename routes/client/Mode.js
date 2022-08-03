const { GameController } = require("../../lib/controllers");


module.exports = async function modeRoutes(app, _opts) {

    app.get(`/mode/offline`, async (request, reply) => {
        await GameController.modeOfflinePatches(request, reply);
    });

    app.get(`/mode/offlineNodes`, async (request, reply) => {
        await GameController.modeOfflinePatchNodes(request, reply);
    });

};

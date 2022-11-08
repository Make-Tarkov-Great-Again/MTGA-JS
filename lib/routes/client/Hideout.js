const { HideoutController } = require("../../controllers");

module.exports = async function hideoutRoutes(app, _opts) {

    app.post(`/client/hideout/areas`, async (request, reply) => {
        await HideoutController.clientHideoutAreas(request, reply);
    });

    app.post(`/client/hideout/production/recipes`, async (request, reply) => {
        await HideoutController.clientHideoutProductionRecipes(request, reply);
    });

    app.post(`/client/hideout/production/scavcase/recipes`, async (request, reply) => {
        await HideoutController.clientHideoutProductionScavcaseRecipes(request, reply);
    });

    app.post(`/client/hideout/settings`, async (request, reply) => {
        await HideoutController.clientHideoutSettings(request, reply);
    });

};

const { HideoutController } = require("../../controllers");

module.exports = async function hideoutRoutes(app, _opts) {

    app.post(`/client/hideout/areas`, async (request, reply) => {
        await HideoutController.clientHideoutAreas(reply);
    });

    app.post(`/client/hideout/production/recipes`, async (request, reply) => {
        await HideoutController.clientHideoutProductionRecipes(reply);
    });

    app.post(`/client/hideout/production/scavcase/recipes`, async (request, reply) => {
        await HideoutController.clientHideoutProductionScavcaseRecipes(reply);
    });

    app.post(`/client/hideout/settings`, async (request, reply) => {
        await HideoutController.clientHideoutSettings(reply);
    });

};

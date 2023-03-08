import { HideoutController } from "../../controllers/_index.mjs";
import { logger } from "../../utilities/_index.mjs";

export default async function hideoutRoutes(app, _opts) {

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

    app.post(`/client/hideout/qte/list`, async (_request, reply) => {
        await HideoutController.clientHideoutQTEList(reply);
    });

    app.put(`/client/hideout/workout`, async (request, reply) => {
        logger.error("nigga you gay");
        await HideoutController.clientHideoutWorkout(request, reply);
    });
};

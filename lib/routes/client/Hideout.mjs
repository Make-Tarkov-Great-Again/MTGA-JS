import { HideoutController } from "../../controllers/_index.mjs";
import { logger } from "../../utilities/_index.mjs";

export default async function hideoutRoutes(app, _opts) {

    app.post(`/client/hideout/areas`, async (_request, reply) => {
        HideoutController.clientHideoutAreas(reply);
    });

    app.post(`/client/hideout/production/recipes`, async (_request, reply) => {
        HideoutController.clientHideoutProductionRecipes(reply);
    });

    app.post(`/client/hideout/production/scavcase/recipes`, async (_request, reply) => {
        HideoutController.clientHideoutProductionScavcaseRecipes(reply);
    });

    app.post(`/client/hideout/settings`, async (_request, reply) => {
        HideoutController.clientHideoutSettings(reply);
    });

    app.post(`/client/hideout/qte/list`, async (_request, reply) => {
        HideoutController.clientHideoutQTEList(reply);
    });

    app.put(`/client/hideout/workout`, async (request, reply) => {
        logger.error("NO GAINS FOR YA");
        await HideoutController.clientHideoutWorkout(request, reply);
    });
};

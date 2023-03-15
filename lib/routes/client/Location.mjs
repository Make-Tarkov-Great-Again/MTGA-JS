import { LocationController, RichPresenseController } from "../../controllers/_index.mjs";
import { Location } from "../../classes/Location.mjs";
import { logger, Response } from "../../utilities/_index.mjs";

import { database } from "../../../app.mjs";

export default async function locationRoutes(app, _opts) {
    const { raid, loot } = database.core.gameplay;

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        
        const sessionID = await Response.getSessionID(request);
        const name = request.body.locationId.toLowerCase();
        const location = Location.get(name); //can see if location is properly acquired

        await RichPresenseController.OnLoadingIntoRaid(sessionID, name);
        await LocationController.updateProfileWhenEnteringMap(sessionID, name, location);

        if (loot.ForcePresetsLoot) {
            return LocationController.clientLocationGetLocalloot(location, request.body.variantId, reply); //i need to fix this by creating class/Location
        } else {
            return LocationController.clientLocationGetGeneratedLoot(name, reply);
        }
    });

    app.get(`/client/location/getAirdropLoot`, async (_request, reply) => {
        const result = [];
        logger.warn("[getAirdropLoot] loot generation not implemented");
        return Response.zlibJsonReply(reply, result);
    });

    app.get(`/singleplayer/settings/raid/menu`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, raid.defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, raid.airdropSettings);
    });

    /**
     * Used only for testing loot generation.
     */

    app.get(`/test/location/loot`, async (request, reply) => {
        return LocationController.testData(request, reply);
    });
};

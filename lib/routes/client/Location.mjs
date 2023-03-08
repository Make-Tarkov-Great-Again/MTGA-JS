import { LocationController } from "../../controllers/_index.mjs";
import { logger, Response } from "../../utilities/_index.mjs";

import { database } from "../../../app.mjs";

export default async function locationRoutes(app, _opts) {
    const { raid, loot } = database.core.gameplay;

    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        if (loot.ForcePresetsLoot) {
            return LocationController.clientLocationGetLocalloot(request, reply);
        } else {
            return LocationController.clientLocationGetGeneratedLoot(request, reply);
        }
    });

    app.get(`/client/location/getAirdropLoot`, async (request, reply) => {
        const result = [];
        logger.warn("[getAirdropLoot] loot generation not implemented");
        return Response.zlibJsonReply(reply, result);
    });

    app.get(`/singleplayer/settings/raid/menu`, async (request, reply) => {
        return Response.zlibJsonReply(reply, raid.defaultRaidSettings);
    });

    app.get(`/singleplayer/airdrop/config`, async (request, reply) => {
        return Response.zlibJsonReply(reply, raid.airdropSettings);
    });

    /**
     * Used only for testing loot generation.
     */

    app.get(`/test/location/loot`, async (request, reply) => {
        return await LocationController.testData(request, reply);
    });
};

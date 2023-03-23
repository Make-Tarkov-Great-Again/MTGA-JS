import { database } from "../../../app.mjs";
import { RaidController, RichPresenseController } from "../../controllers/_index.mjs";
import { logger, stringify, Response } from "../../utilities/_index.mjs";


export default async function raidRoutes(app, _opts) {

    app.post(`/client/raid/person/killed/showMessage`, async (request, reply) => {
        await RaidController.showKilledMessage(request, reply); //
    });

    app.post(`/client/raid/configuration`, async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            { err: 0 });
    });

    app.post(`/client/raid/person/killed`, async (request, reply) => {
        await RaidController.personKilled(request, reply); //
    });

    app.post(`/client/raid/createFriendlyAI`, async (_request, reply) => {
        const { createFriendlyAI } = database.core.gameplay.raid.inRaid;
        return Response.zlibJsonReply(reply, createFriendlyAI);
    });

    app.post(`/client/raid/bots/getNewProfile`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, {});
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, reply) => {
        logger.warn(stringify(request.body));
        return Response.zlibJsonReply(reply, "");
    });

    app.post(`/client/raid/profile/save`, async (request, reply) => {
        await RichPresenseController.OnEndRaid(await Response.getSessionID(request), request.body.ExitStatus)
        await RaidController.save(request, reply);
    });

}
import {
    ProfileController,
    MoveController,
} from "../../controllers/_index.mjs";

import { logger, Response } from "../../utilities/_index.mjs";

export default async function profileRoutes(app, _opts) {

    app.post("/client/profile/status", async (request, reply) => {
        await ProfileController.profileStatus(request, reply);
    });

    app.post("/client/game/profile/list", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await ProfileController.profileList(sessionID, reply);
    });

    app.post("/client/game/profile/select", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await ProfileController.profileSelect(sessionID, reply);
    });

    app.post("/client/game/profile/nickname/reserved", async (request, reply) => {
        await ProfileController.profileNicknameReserved(reply);
    });

    app.post("/client/game/profile/nickname/validate", async (request, reply) => {
        await ProfileController.profileNicknameValidate(request, reply);
    });

    app.post("/client/game/profile/nickname/change", async (request, reply) => {
        await ProfileController.profileNicknameChange(request, reply);
    });

    app.post("/client/game/profile/create", async (request, reply) => {
        await ProfileController.profileCreate(request, reply);
    });

    app.post("/client/game/profile/voice/change", async (request, reply) => {
        await ProfileController.profileVoiceChange(request, reply);
    });

    app.post(`/client/game/profile/savage/regenerate`, async (request, reply) => {
        logger.warn(`/client/game/profile/savage/regenerate not implemented`);

        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    });

    app.post(`/client/game/profile/items/moving`, async (request, reply) => {
        await MoveController.clientGameProfileItemsMoving(request, reply);
    });

};

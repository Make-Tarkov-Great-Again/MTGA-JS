import { GameController } from "../../controllers/_index.mjs";
import { Response } from "../../classes/_index.mjs";
import { getCurrentTimestamp } from "../../utilities/_index.mjs";

export default async function gameRoutes(app, _opts) {

    app.post("/client/game/keepalive", async (request, reply) => {
        await GameController.clientGameKeepAlive(Response.getSessionID(request), reply);
    });

    app.post(`/client/game/config`, async (request, reply) => {
        await GameController.clientGameConfig(Response.getSessionID(request), reply);
    });

    app.post(`/client/game/start`, async (_request, reply) => {
        await GameController.clientGameStart(reply, getCurrentTimestamp());
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(reply);
    });

    app.post("/client/game/logout", async (request, reply) => {
        await GameController.logout(Response.getSessionID(request), reply);
    });
};

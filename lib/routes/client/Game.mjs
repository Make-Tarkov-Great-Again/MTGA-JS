import { GameController } from "../../controllers/_index.mjs";
import { Response, getCurrentTimestamp } from "../../utilities/_index.mjs";
export default async function gameRoutes(app, _opts) {

    app.post("/client/game/keepalive", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await GameController.clientGameKeepAlive(sessionID, reply);
    });

    app.post(`/client/game/config`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await GameController.clientGameConfig(sessionID, reply);
    });

    app.post(`/client/game/start`, async (_request, reply) => {
        await GameController.clientGameStart(
            reply,
            getCurrentTimestamp()
        );
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(reply);
    });

    app.post("/client/game/logout", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await GameController.logout(sessionID, reply);
    });
};

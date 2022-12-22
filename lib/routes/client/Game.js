const { GameController } = require("../../controllers");
const { sessionID } = require("../../engine/WebInterface");
const { Profile } = require("../../models/Profile")
const { Response, getCurrentTimestamp } = require("../../utilities");

module.exports = async function gameRoutes(app, _opts) {

    app.post("/client/game/keepalive", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await GameController.clientGameKeepAlive(sessionID, reply);
    });

    app.post(`/client/game/config`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await GameController.clientGameConfig(sessionID, reply);
    });

    app.post(`/client/game/start`, async (request, reply) => {
        await GameController.clientGameStart(
            reply,
            await getCurrentTimestamp()
        );
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(reply);
    });

    app.post("/client/game/logout", async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        const playerProfile = await Profile.get(sessionID);
        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({ status: "ok" })
        );
    });

};

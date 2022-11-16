const { GameController } = require("../../controllers");
const { Profile } = require("../../models/Profile")
const { Response, getCurrentTimestamp } = require("../../utilities");

module.exports = async function gameRoutes(app, _opts) {

    app.post("/client/game/keepalive", async (request, reply) => {
        await GameController.clientGameKeepAlive(await Response.getSessionID(request), reply);
    });

    app.post(`/client/game/config`, async (request, reply) => {
        await GameController.clientGameConfig(
            await Response.getSessionID(request), reply);
    });

    app.post(`/client/game/start`, async (request, reply) => {
        await GameController.clientGameStart(
            reply,
            await getCurrentTimestamp()
        );
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(request.body.version.major, reply);
    });

    app.post("/client/game/logout", async (request, reply) => {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({ status: "ok" })
        );
    });

};

const { GameController } = require("../../lib/controllers");
const { Bot } = require("../../lib/models/Bot");
const { Profile } = require("../../lib/models/Profile")
const { Response, writeFile, stringify, logger } = require("../../utilities");

module.exports = async function gameRoutes(app, _opts) {

    app.post("/client/game/keepalive", async (request, reply) => {
        await GameController.clientGameKeepAlive(request, reply);
    });

    app.post(`/client/game/config`, async (request, reply) => {
        await GameController.clientGameConfig(request, reply);
    });

    app.post(`/client/game/start`, async (request, reply) => {
        await GameController.clientGameStart(request, reply);
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(request, reply);
    });

    app.post('/client/game/bot/generate', async (request, reply) => {
        const bots = await Bot.generateBots(request, reply);
        //writeFile("./generatedBots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(bots)
        );
    });

    app.post('/client/game/profile/search', async (request, reply) => {
        logger.log(request.body)
        return Profile.getAll().filter(profile => {
            if (profile._id === sessionID) return;
        })
    });

    app.post("/client/game/logout", async (request, reply) => {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({ status: "ok" })
        );
    });

};

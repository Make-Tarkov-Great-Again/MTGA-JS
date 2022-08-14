const { GameController } = require("../../lib/controllers");
const { Bot } = require("../../lib/models/Bot");
const { logger, FastifyResponse, writeFile, stringify } = require("../../utilities");

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
        const bots = await Bot.generateBots(request, reply)
        writeFile("./generatedBots.json", stringify(bots));
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(bots)
        );
    });

    app.post("/client/game/logout", async (_request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ status: "ok" })
        );
    });
    
};

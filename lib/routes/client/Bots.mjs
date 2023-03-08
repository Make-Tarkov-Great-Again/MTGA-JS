import { BotController } from "../../controllers/BotController.mjs";

export default async function botRoutes(app, _opts) {

    app.post('/client/game/bot/generate', async (request, reply) => {
        await BotController.generateBots(request, reply);
    });

    app.get(`/singleplayer/settings/bot/difficulty/*`, async (request, reply) => {
        await BotController.botDifficulties(request, reply);
    });
}
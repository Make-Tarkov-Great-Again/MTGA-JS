import { database } from "../../app.mjs";
import { stringify, write, logger } from "../utilities/_index.mjs";
import { Bot, Response } from "../classes/_index.mjs";


export class BotController {
    static async generateBots(request, reply) {
        const bots = database.core.gameplay.bots.preload.enabled
            ? await Bot.usePreloadedBots(request)
            : await Bot.generateBots(request);

        if (database.core.gameplay.development.debugBots)
            await write("./generatedbots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(bots)
        );
    }

    static async botDifficulties(request, reply) {
        const { core, bots } = database.bot;
        const [botName, difficultyType] = request.params['*'].split("/");

        if (botName in bots && difficultyType in bots[botName].difficulty) {
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(bots[botName].difficulty[difficultyType])
            );
        } else {
            logger.error(`Bot: ${botName} does not have a difficulty: ${difficultyType}`);
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(core)
            );
        }
    }
}
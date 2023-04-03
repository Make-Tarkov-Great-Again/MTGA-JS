import { database } from "../../app.mjs";
import { stringify, writeFile, logger, zlibJsonReply, applyBody } from "../utilities/_index.mjs";
import { Bot } from "../classes/Bot.mjs";


export class BotController {
    static async generateBots(request, reply) {
        const bots = database.core.gameplay.bots.preload.enabled
            ? await Bot.usePreloadedBots(request)
            : await Bot.generateBots(request);
            
        if (database.core.gameplay.development.debugBots)
            await writeFile("./generatedbots.json", stringify(bots));
        return zlibJsonReply(
            reply,
            await applyBody(bots)
        );
    }

    static async botDifficulties(request, reply) {
        const { core, bots } = database.bot;
        const [botName, difficultyType] = request.params['*'].split("/");
    
        if (botName in bots && difficultyType in bots[botName].difficulty) {
            return zlibJsonReply(
                reply,
                await applyBody(bots[botName].difficulty[difficultyType])
            );
        } else {
            logger.error(`Bot: ${botName} does not have a difficulty: ${difficultyType}`);
            return zlibJsonReply(
                reply,
                await applyBody(core)
            );
        }
    }
}
import { database } from "../../app.mjs";
import { stringify, writeFile, Response, logger } from "../utilities/_index.mjs";
import { Bot } from "../classes/Bot.mjs";


export class BotController {
    static async generateBots(request, reply) {
        const bots = database.core.gameplay.bots.preload.enabled
            ? await Bot.usePreloadedBots(request)
            : await Bot.generateBots(request);
            
        if (database.core.gameplay.development.debugBots)
            await writeFile("./generatedbots.json", stringify(bots));
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(bots)
        );
    }

    static async botDifficulties(request, reply) {
        const { core, bots } = database.bot;
        const keys = request.params['*'].split("/");

        if (keys[0] in bots) {
            if (keys[1] in bots[keys[0]].difficulty) {
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(bots[keys[0]].difficulty[keys[1]])
                );
            }
        } else {
            logger.error(`Bot: ${keys[0]} does not have a difficulty: ${keys[1]}`);
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(core)
            );
        }
    }
}
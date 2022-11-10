const { Language } = require('../models/Language');
const { Trader } = require('../models/Trader');

const { TaskerController } = require("./TaskerController");

const { getCurrentTimestamp, logger, Response } = require("../utilities");


class GameController {

    static async clientGameStart(_request, reply) {
        await this.clientSeasonalEventCheck()

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                { utc_time: await getCurrentTimestamp() },
            )
        );
    }

    static async clientSeasonalEventCheck() {
        let { database: { core: {
            globals: { config: {
                EventType,
                Health: { ProfileHealthSettings: { DefaultStimulatorBuff } }
            } },
            gameplay: { seasonalEvents } } } } = require('../../app');


        if (seasonalEvents.enable) {
            const date = new Date();
            for (const event of seasonalEvents.events) {
                const eventStartDate = new Date(date.getFullYear(), event.startMonth - 1, event.startDay);
                const eventEndDate = new Date(date.getFullYear(), event.endMonth - 1, event.endDay);

                if (date >= eventStartDate && date <= eventEndDate) {
                    if (event.name === "Halloween") {
                        EventType.push("Halloween", "HalloweenIllumination");
                        DefaultStimulatorBuff = "Buffs_Halloween"
                    }
                    if (event.name === "Christmas") {
                        EventType.push("Christmas");
                        await this.clientEnableDancingChristmasTree();
                    }
                }
            }
        }
    }

    static async clientEnableDancingChristmasTree() {
        const { database: { locations } } = require('../../app');
        for (const location of locations) {
            for (const variant of location) {
                if (variant.BotLocationModifier?.KhorovodChance)
                    variant.BotLocationModifier.KhorovodChance = 100;
            }
        }
    }

    static async clientGameVersionValidate(request, reply) {
        logger.info("Client connected with version: " + request.body.version.major);
        return Response.zlibJsonReply
            (
                reply,
                await Response.applyBody(null)
            );
    }

    static async clientGameConfig(request, reply) {
        const sessionID = await Response.getSessionID(request);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                aid: sessionID,
                lang: "en",
                languages: await Language.getAllWithoutKeys(),
                ndaFree: false,
                taxonomy: 341,
                activeProfileId: `pmc${sessionID}`,
                backend: {
                    Trading: Response.getBackendUrl(),
                    Messaging: Response.getBackendUrl(),
                    Main: Response.getBackendUrl(),
                    RagFair: Response.getBackendUrl()
                },
                utc_time: await getCurrentTimestamp(),
                totalInGame: 1,
                reportAvailable: true,
                twitchEventMember: false
            })
        );
    }

    static async clientGameKeepAlive(request, reply) {
        const sessionID = await Response.getSessionID(request);

        // traders assorts
        const traders = await Trader.getAllWithoutKeys();
        for (const trader of traders) {
            await trader.generateAssort(await getCurrentTimestamp());
        }

        await TaskerController.runTasks(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    msg: "OK",
                    utc_time: await getCurrentTimestamp()
                })
        );
    }
}
module.exports.GameController = GameController;

const { Language } = require('../models/Language');
const { Trader } = require('../models/Trader');
const { Location } = require('../models/Location');
const { Profile } = require('../models/Profile');

const { TaskerController } = require("./TaskerController");
let { database: { core: {
    locations: { locations },
    globals: { config: {
        EventType,
        Health: { ProfileHealthSettings: { DefaultStimulatorBuff } }
    } },
    gameplay: { seasonalEvents } } } } = require('../../app');

const { getCurrentTimestamp, logger, Response, readParsed } = require("../utilities");


class GameController {

    static async clientGameStart(reply, timeStamp, sessionID) {
        await this.clientSeasonalEventCheck()
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                { utc_time: timeStamp },
            )
        );
    }

    static async clientSeasonalEventCheck() {
        if (seasonalEvents.enable) {
            const date = new Date();
            for (const event of seasonalEvents.events) {
                const eventStartDate = new Date(date.getFullYear(), event.startMonth - 1, event.startDay);
                const eventEndDate = new Date(date.getFullYear(), event.endMonth - 1, event.endDay);

                if (date >= eventStartDate && date <= eventEndDate) {
                    if (event.name === "Halloween") {
                        EventType.push("Halloween", "HalloweenIllumination");
                        DefaultStimulatorBuff = "Buffs_Halloween"
                        return;
                    }
                    if (event.name === "Christmas") {
                        EventType.push("Christmas");
                        await this.wigglyChristmasTree();
                        await this.santaClauseIsComingToTown();
                        return;
                    }
                }
            }
            EventType = ["None"]; // incase globals have EventType set
        }
    }

    static async santaClauseIsComingToTown() {
        const { santaSpawns } = await readParsed(`./assets/database/configs/seasonalevents.json`);
        for (const spawn of santaSpawns) {
            for (const key in locations) {
                const variant = locations[key];
                variant.BossLocationSpawn.push({
                    BossName: "gifter",
                    BossChance: spawn.spawnChance,
                    BossZone: spawn.zones,
                    BossPlayer: false,
                    BossDifficult: "normal",
                    BossEscortType: "gifter",
                    BossEscortDifficult: "normal",
                    BossEscortAmount: "0",
                    Time: -1,
                    TriggerId: "",
                    TriggerName: "",
                    Delay: 0,
                    RandomTimeSpawn: false
                })
            }
        }
    }

    static async wigglyChristmasTree() {
        const { database: { locations } } = require('../../app');
        for (const index in locations) {
            const location = locations[index];
            for (const v in location) {
                const variant = location[v];
                if (variant.BotLocationModifier?.KhorovodChance)
                    variant.BotLocationModifier.KhorovodChance = 100;
            }
        }
    }

    static async clientGameVersionValidate(reply) {
        return Response.zlibJsonReply
            (
                reply,
                await Response.applyEmpty("null")
            );
    }

    static async clientGameConfig(sessionID, reply) {
        const backend = await Response.getBackendUrl();
        const languages = await Language.getAll();
        const time = await getCurrentTimestamp();

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                aid: sessionID,
                lang: "en",
                languages: languages,
                ndaFree: false,
                taxonomy: 6,
                activeProfileId: `pmc${sessionID}`,
                backend: {
                    Lobby: backend,
                    Trading: backend,
                    Messaging: backend,
                    Main: backend,
                    RagFair: backend
                },
                utc_time: time,
                totalInGame: 1,
                reportAvailable: true,
                twitchEventMember: false
            })
        );
    }

    static async clientGameKeepAlive(sessionID, reply) {
        // traders assorts

        const time = await getCurrentTimestamp();

        const traders = await Trader.getAllWithoutKeys();
        for (const trader of traders) {
            await trader.generateAssort(time);
        }

        await TaskerController.runTasks(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    msg: "OK",
                    utc_time: time
                })
        );
    }
}
module.exports.GameController = GameController;

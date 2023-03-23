/* 
import { Trader } from '../models/Trader';
 */

import { database } from '../../app.mjs';

import { Language, Profile, Account } from '../classes/_index.mjs';
import { getCurrentTimestamp, Response, readParsed } from "../utilities/_index.mjs";


export class GameController {

    static async clientGameStart(reply, timeStamp) {
        await this.clientSeasonalEventCheck()
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                { utc_time: timeStamp },
            )
        );
    }

    static async clientSeasonalEventCheck() {
        const { gameplay, globals, locations } = database.core;
        if (gameplay.seasonalEvents.enable) {
            const date = new Date();
            for (const event of gameplay.seasonalEvents.events) {
                const eventStartDate = new Date(date.getFullYear(), event.startMonth - 1, event.startDay);
                const eventEndDate = new Date(date.getFullYear(), event.endMonth - 1, event.endDay);

                if (date >= eventStartDate && date <= eventEndDate) {
                    if (event.name === "Halloween") {
                        globals.config.EventType.push("Halloween", "HalloweenIllumination");
                        globals.config.Health.ProfileHealthSettings.DefaultStimulatorBuff = "Buffs_Halloween"
                        return;
                    }
                    if (event.name === "Christmas") {
                        globals.config.EventType.push("Christmas");
                        await this.wigglyChristmasTree(locations);
                        await this.santaClauseIsComingToTown(locations);
                        return;
                    }
                }
            }
            globals.config.EventType = ["None"]; // incase globals have EventType set
        }
    }

    static async santaClauseIsComingToTown(locations) {
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

    static async wigglyChristmasTree(locations) {
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
        const languages = Language.getAll();
        const time = getCurrentTimestamp();

        const account =  Account.getWithSessionId(sessionID);
        const accountLang = (account?.lang)
            ? account.lang
            : "en";

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({
                aid: sessionID,
                lang: accountLang,
                languages: languages,
                ndaFree: false,
                taxonomy: 6,
                activeProfileId: sessionID,
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

        const time = getCurrentTimestamp();

        //const traders = await Trader.getAllWithoutKeys();
        //for (const trader of traders) {
        //    await trader.generateAssort(time);
        //}

        //await TaskerController.runTasks(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    msg: "OK",
                    utc_time: time
                })
        );
    }

    static async logout(sessionID, reply) {
        await Profile.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody({ status: "ok" })
        );
    }
}

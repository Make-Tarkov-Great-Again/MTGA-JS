import { exec, spawn } from 'child_process';
import { fileExist } from '../utilities/fileIO.mjs';
import { logger } from "../utilities/_index.mjs";
import { database } from '../../app.mjs';
import { writeFileSync } from 'fs';
import { Account } from '../classes/_index.mjs';

/**
 * Controls Tauri Launcer shit, Dont fuck with  t o o   much
 * 
 * TODO: Config Controller with Authenicate 
 * 
 * TODO: Mod manager with Pixel & Slejm
 * 
 * TODO: Profile editor (Already have Levels.js in launcher.)
 * 
 * TODO: Settings (Wipe, change edition, password, etc.)
 */
export class LauncherControllerinator {
    static async LaunchGame(request, reply) {
        reply.type("text/html");
        const tarkovPath = request.body.tarkovPath
        const sessionID = request.body.sessionID
        if (database.profiles[sessionID]) {
            if (fileExist(tarkovPath)) {
                logger.info("[TAURI LAUNCHER] Recieved launch command. Launching...")
                const { serverConfig } = database.core;
                try {
                    exec(`${tarkovPath} -bC5vLmcuaS5u= -token=${sessionID} -config={"BackendUrl":"https://${serverConfig.ip}:${serverConfig.port}","Version":"live"}`)
                } catch (error) {
                    logger.info(error)
                }
                return ("SUCCESS")
            }
            else {
                logger.error("[TAURI LAUNCHER] INVALID TARKOV PATH! ")
                return ("TARKOV_PATH_INVALID")
            }
        }
        else {
            logger.error("[TAURI LAUNCHER] INVALID SESSIONID!")
            return ("INVALID_SESSION")
        }
    }
    static UpdateProfileDataInLauncher(request, reply) {
        const sessionID = request.body.sessionID
        const experience = database.profiles[sessionID]?.character?.Info?.Experience
        const Level = database.profiles[sessionID]?.character?.Info?.Level

        reply.type("application/json")
        return reply.send({
            experience: experience,
            level: Level,
            // TODO: Add health counter to this to show players health so they know how healed they are if they're waiting?
            //Does MTGA even update health when not in game and all that?
            // health: healthTotal
        })
    }
    static getConfig(request, reply) {
        const sessionID = request.body.sessionID
        const profile = database.profiles[sessionID]
        let config = profile?.account?.Config
        if (!profile) {
            return reply.send("NOT_EXIST")
        }
        else if (!config) {
            let profileConfig = []
            reply.type("application/json")
            return reply.send(profileConfig)
        }
        else if (config) {
            let profileConfig = config
            reply.type("application/json")
            return reply.send(profileConfig)
        }
    }

    static updateConfig(request, reply) {
        const key = request.body.key;
        const sessionID = request.body.sessionID;
        const profile = database.profiles[sessionID];

        if (!profile) {
            return reply.send("NOT_EXIST");
        }

        const config = profile.account.Config;
        if (config) {
            config[key] = request.body.config;
        } else {
            profile.account.Config = { [key]: request.body.config };
        }

        const path = Account.getAccountFilePath(sessionID);
        writeFileSync(path, JSON.stringify(profile.account));

        return reply.send("Success");
    }
    // TODO: Install prettify to prettyify the config before writing it again (Or maybe ill leave it to piss Nehax off.), 
    // TODO: Copy and Reformat mods config.jsons to be compatiable
    // TODO: Check for missing mods when launching profile, 
    // TODO: Warn user that they will fuck shit up if they play on the modded profile with modded items without the mods.
}

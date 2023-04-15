import { exec, spawn } from 'child_process';
import { fileExist } from '../utilities/fileIO.mjs';
import { logger } from "../utilities/_index.mjs";
import { database } from '../../app.mjs';


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
    static UpdateProfileDataInLauncher(request, reply){
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
}

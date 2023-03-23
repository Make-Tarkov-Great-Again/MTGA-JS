import { database, rpc } from "../../app.mjs";


/**
* Controls the RichPresense for MTGA
*
*@param {*} state  Appears on top, Used for stuff like map details or what the players doing, i.e "In Stash" or "Factory"
*@param {*} details Appears under state, is used for flavour text like "Looking for phat loot"
*@param {*} startTimestamp Start timestamp in epoch seconds, usually is date.now()
*@param {*} endTimestamp When the elapsed time should end, in epoch seconds, used to count how long until a raid ends, (lol i wish)
*@param {*} largeImageKey The image ID given on discord API applacation
*@param {*} largeImageText Text that will appear when hovering over large image used for details pmuch. 
*@param {*} smallImageKey Small image ID, used for players side, 
*@param {*} smallImageText Text that will appear when hovering over the small image, used for side, (bear, usec)
*/
export class RichPresense {


    static get(sessionID) {
        if (database.profiles[sessionID])
            return database.profiles[sessionID].richPresense;
        return false;
    }

    static checkInternet() {
        return database.connection;
    }

    static async setActivity(activity) {
        await rpc.user?.clearActivity()
        await rpc.user?.setActivity(activity);
    }

    static generateLoginActivity() {
        return {
            state: null,
            details: null,
            startTimestamp: null,
            largeImageKey: "logo",
            largeImageText: "Make Tarkov Great Again",
        }
    }
}

import { database } from "../../app.mjs";
import { logger } from "../utilities/_index.mjs";

import { Account } from "./Account.mjs";
import { Character } from "./Character.mjs";
import { Storage } from "./Storage.mjs";
//import { Special } from "./Special.mjs"
import { Dialogues } from "./Dialogues.mjs";

/**
 * So i was thinking that we should have something similar to our previous models,
 * but i reverted a lot of shit because i got mad
 * 
 * 
 */


export class Profile {

    static async create(account, character, storage) {
        const profile = database.profiles[account.id];

        profile.character = character;
        profile.storage = {
            _id: character._id,
            suites: storage,
            builds: {},
            insurance: [],
            mailbox: []
        };
        profile.special = {};
        profile.dialogues = {};
    }

    static get(sessionID) {
        return database.profiles[sessionID];
    }

    static getAll(){
        return database.profiles;
    }

    static async save(sessionID) {
        await Promise.allSettled([
            await Account.save(sessionID),
            await Character.save(sessionID),
            await Storage.save(sessionID),
            //await Special.save(sessionID),
            await Dialogues.save(sessionID)
        ]);
    }

    static async isAvailableNickname(nickname) {
        if (nickname.length < 3)
        return "tooshort";

        const profiles = database.profiles;
        for (const id in profiles) {
            const profile = profiles[id];
            if (!profile?.character)
                continue;
            if (profile.character.Info.Nickname === nickname)
                return "taken";
        }
        return "ok";
    }
}

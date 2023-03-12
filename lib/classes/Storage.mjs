import { database } from "../../app.mjs";

import {
    stringify, fileExist, writeFile, readParsed,
    getFileUpdatedDate, logger,
} from "../utilities/_index.mjs";

export class Storage {
    /**
     * Return the path of the storage.json file for this profile
     * @returns {Promise<String>}
     */
    static getStoragePath(sessionID) {
        return `./user/profiles/${sessionID}/storage.json`;
    }

    static get(sessionID) {
        return database.profiles[sessionID].storage;
    }

    static getSuites(sessionID) {
        return database.profiles[sessionID].storage.suites;
    }

    static addCustomization(sessionID, id) {
        const suites = this.getSuites(sessionID);
        suites.push(id);
    }

    static getBuilds(sessionID) {
        return database.profiles[sessionID].storage.builds;
    }

    static getInsurance(sessionID) {
        return database.profiles[sessionID].storage.insurance;
    }

    static getMailbox(sessionID) {
        return database.profiles[sessionID].storage.mailbox;
    }

    /**
    * Write/Save storage changes to file
    * @param {string} sessionID 
    */
    static async save(sessionID) {
        const storagePath = this.getStoragePath(sessionID);
        const storage = this.get(sessionID);

        if (!storage)
            return;

        const currentStorage = stringify(storage);
        if (!await fileExist(storagePath)) {
            await writeFile(storagePath, currentStorage);
            database.fileAge[sessionID].storage = await getFileUpdatedDate(storagePath);

            logger.info(`[STORAGE SAVE] Storage file for ${sessionID} registered and saved to disk.`);
            return;
        }

        // Check if the memory content differs from the content on disk
        const savedStorage = stringify(await readParsed(storagePath));
        if (savedStorage !== currentStorage) {
            await writeFile(storagePath, currentStorage);
            database.fileAge[sessionID].storage = await getFileUpdatedDate(storagePath);

            logger.info(`[STORAGE SAVE] Storage file for profile ${sessionID} saved to disk.`);
        } else
            logger.info(`[STORAGE SAVE] Storage file for profile ${sessionID} save skipped!`);
    }


}
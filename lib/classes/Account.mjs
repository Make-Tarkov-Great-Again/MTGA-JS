import { database } from "../../app.mjs";
import { logger } from "../utilities/pino.mjs";
import {
    createDirectory, getFileUpdatedDate, fileExist,
    writeFile, stringify, readParsed
} from "../utilities/_index.mjs";


export class Account {
    static async create(id, email, password, edition) {
        const profile = database.profiles[id] = {}
        profile.account = {
            id: id,
            email: email,
            password: password,
            wipe: true,
            edition: edition,
            friends: {
                Friends: [],
                Ignore: [],
                InIgnoreList: []
            },
            Matching: {
                LookingForGroup: false
            },
            friendRequestInbox: [],
            friendRequestOutbox: []
        };

        this.save(id);
    }

    static getWithSessionId(sessionID) {
        return database.profiles[sessionID]?.account ? database.profiles[sessionID].account : false;
    }

    static async getAccountWithEmail(email) {
        for (const account in database.profiles) {
            if (database.profiles[account]?.account?.email === email)
                return database.profiles[account].account;
        }
        logger.warn(`[Account.getAccountWithEmail] Couldn't find account with email ${email}`);
        return false;
    }

    static getAccountFilePath(sessionID) {
        return `${this.getAccountDirectory(sessionID)}/account.json`;
    };

    static getAccountDirectory(sessionID) {
        return `./user/profiles/${sessionID}`;
    }

    /**
     * Dump account object to file
     * @param {string} sessionID
     * @returns
     */
    static async save(sessionID) {
        if (!database.fileAge[sessionID])
            database.fileAge[sessionID] = {};

        if (!await fileExist(`./user/profiles/${sessionID}`))
            await createDirectory(`./user/profiles/${sessionID}`);

        const accountPath = this.getAccountFilePath(sessionID);
        // Does the account file exist? (Required for new accounts)

        const currentAccount = stringify(database.profiles[sessionID].account);
        if (!await fileExist(accountPath)) {
            await writeFile(accountPath, currentAccount);
            database.fileAge[sessionID].account = await getFileUpdatedDate(accountPath);

            logger.info(`[ACCOUNT] Account ${sessionID} registered and was saved to disk.`);
            return;
        }

        // Check if the memory content differs from the content on disk
        const savedAccount = stringify(await readParsed(accountPath));
        if (currentAccount !== savedAccount) {
            await writeFile(accountPath, currentAccount);
            database.fileAge[sessionID].account = await getFileUpdatedDate(accountPath);

            logger.info(`[ACCOUNT SAVE] Account file for profile ${sessionID} saved to disk.`);
        } else
            logger.info(`[ACCOUNT SAVE] Account file for profile ${sessionID} save skipped!`);
    }
}
import { database } from "../../app.mjs";
import { Account } from "./Account.mjs";
import { Locale } from "./Locale.mjs";
import { Trader } from "./Trader.mjs";
import { Item } from "./Item.mjs";

import {
    stringify, fileExist, writeFile,
    getFileUpdatedDate, logger,
    generateMongoID, getCurrentTimestamp, readParsed
} from "../utilities/_index.mjs";

export class Dialogues {

    /**
    * Return the path of the dialogue.json file for this profile
    * @returns {Promise<String>}
    */
    static getDialoguesPath(sessionID) {
        return `./user/profiles/${sessionID}/dialogues.json`;
    }

    static get(sessionID) {
        return database.profiles[sessionID].dialogues;
    }

    static getById(sessionID, dialogId) {
        return database.profiles[sessionID].dialogues[dialogId];
    }

    static async activeMessages(sessionID, dialogue) {
        const time = getCurrentTimestamp();
        const dialog = await this.getById(sessionID, dialogue._id);
        return dialog.messages.filter(
            message => time < (message.dt + message.maxStorageTime)
        );
    }

    static async messagesWithAttachments(sessionID, dialogue) {
        const activeMessages = await this.activeMessages(sessionID, dialogue);
        return activeMessages.filter(message => message.items?.data?.length > 0);
    }

    static async hasMessagesWithRewards(dialogue) {
        return dialogue.messages.some(message => message.items?.data?.length > 0);
    }

    static async getAttachmentsNew(sessionID, dialogue) {
        let output = 0;
        const messages = await this.activeMessages(sessionID, dialogue);
        messages.forEach(message => {
            if (message.hasRewards && !message.rewardCollected)
                output++;
        });
        return output;
    }

    /**
    * Write/Save dialogue changes to file
    * @param {string} sessionID 
    */
    static async save(sessionID) {
        const dialoguePath = this.getDialoguesPath(sessionID);
        const dialogues = database.profiles[sessionID]?.dialogues;

        if (!dialogues)
            return;

        const currentDialogues = stringify(dialogues);
        if (!await fileExist(dialoguePath)) {
            await writeFile(dialoguePath, currentDialogues);
            database.fileAge[sessionID].dialogues = await getFileUpdatedDate(dialoguePath);

            logger.info(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} registered and saved to disk.`);
            return;
        }

        // Check if the memory content differs from the content on disk
        const savedDialogues = stringify(await readParsed(dialoguePath));
        if (currentDialogues !== savedDialogues) {
            await writeFile(dialoguePath, currentDialogues);
            database.fileAge[sessionID].dialogues = await getFileUpdatedDate(dialoguePath);

            logger.info(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} saved to disk.`);
        } else
            logger.info(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} save skipped!`);

    }

    static async getMessageTypeByName(name) {
        const messageType = {
            "User": 1,
            "Trader": 2,
            "Auction": 3,
            "Flea": 4,
            "Admin": 5,
            "Group": 6,
            "System": 7,
            "Insurance": 8,
            "Global": 9,
            "QuestStart": 10,
            "QuestFail": 11,
            "QuestSuccess": 12,
            "MessageWithItems": 13,
            "Support": 14
        }
        return messageType[name];
    }

    static async getUsersOfUserMessage(users, sessionId) {
        const output = []
        for (const user of users) {
            if (user._id !== sessionId)
                output.push(user);
        }
        return output;
    }

    static async createMessageContent(locale, type, time) {
        return {
            templateId: locale, //is description for whatever reason
            type: type, //start
            maxStorageTime: time * 3600
        };
    }

    static async createPlayerDialogue(dialogId, sessionID) {
        const dialogue =
            this.getById(sessionID, dialogId) ?? {
                attachmentsNew: 0,
                new: 0,
                type: 1,
                Users: [],
                pinned: false,
                messages: [],
                _id: sessionID
            };

        dialogue.new += 1;
        database.profiles[sessionID].dialogues[dialogId] = dialogue;
        return dialogue;
    }

    static async playerMessageForMessageSend(text, uid) {
        const id = generateMongoID();
        return {
            _id: id,
            uid: uid,
            type: 1,
            dt: getCurrentTimestamp(),
            text: text,
            hasRewards: false
        }
    }

    static async playerMessageForDialogList(message) {
        return {
            dt: message.dt,
            type: 1,
            text: message.text,
            uid: message.uid,
        }
    }

    static async traderMessageForDialogList(message) {
        return {
            dt: message.dt,
            type: message.type,
            text: message.text,
            uid: message.uid,
            templateId: message.templateId,
        }
    }

    static async generateQuestDialogMessage(character, quest, rewards, dialogueType, text) {
        const { lang } = await Account.getWithSessionId(character.aid);
        const locale = await Locale.getQuestLocales(lang, quest._id);

        const messageContent = await this.createMessageContent(
            locale[text],
            dialogueType,
            (database.core.gameplay.trading.redeemTimeInHours * 3600)
        );

        return this.generateTraderDialogue(
            character,
            quest.traderId,
            messageContent,
            rewards,
            true
        );
    }

    static async createDialogue(dialogId, character) {
        const dialogue =
            await this.getById(character.aid, dialogId) ?? {
                attachmentsNew: 0,
                new: 0,
                pinned: false,
                messages: [],
                _id: dialogId
            };

        dialogue.new += 1;
        database.profiles[character.aid].dialogues[dialogId] = dialogue;
        return dialogue;
    }

    static async generateMailDialogListDialogue(dialogue, sessionId = null) {
        const output = {
            attachmentsNew: dialogue.attachmentsNew,
            new: dialogue.new,
            type: 0,
            pinned: dialogue.pinned,
            message: {},
            _id: dialogue._id
        };

        if (!dialogue.type) {
            const traderIDs = Object.keys(Trader.getAll());
            if (traderIDs.includes(dialogue._id))
                output.type = 2;
        }
        else output.type = dialogue.type;

        const message = dialogue.messages[dialogue.messages.length - 1];
        if (message.type === 1) {
            output.attachmentsNew = 0;
            output.Users = await this.getUsersOfUserMessage(dialogue.Users, sessionId);
            output.message = await this.playerMessageForDialogList(message);
        } else {
            output.message = await this.traderMessageForDialogList(message);
        }

        return output;
    }

    static async createMessageContents(traderID, message, rewards, items) {
        const id = generateMongoID();
        const currentTime = getCurrentTimestamp();

        const output = {
            _id: id,
            uid: traderID,
            type: message.type,
            dt: currentTime,
            templateId: message.templateId,
            text: message.text ?? "",
            rewardCollected: false,
            hasRewards: false,
            items: items,
            maxStorageTime: message.maxStorageTime
        };

        if (message.type === 10)
            output.text = "quest started";
        if (message.type === 11)
            output.text = "quest failed";
        if (message.type === 12)
            output.text = "quest success";
        if (rewards !== null)
            output.hasRewards = (rewards.length > 0);
        if (message.systemData)
            output["systemData"] = message.systemData;
        if (message.profileChangeEvents?.length === 0)
            output.profileChangeEvents = message.profileChangeEvents;

        return output;
    }

    /**
    * Add dialogue to character, then send notification
    * @param {string} traderID 
    * @param {object} contents 
    * @param {array} rewards 
    * @param {string} sessionID 
    */
    static async generateTraderDialogue(character, traderID, contents, rewards = undefined, quest = undefined) {
        const dialogue = await this.createDialogue(traderID, character);

        const items = {};
        if (rewards?.length > 0) {
            items.stash = generateMongoID();

            const dialogueItems = await this.generateDialogueItems(rewards, items.stash, quest);
            if (dialogueItems)
                items.data = dialogueItems;

            dialogue.attachmentsNew += 1;
        }

        const message = await this.createMessageContents(traderID, contents, rewards, items);
        dialogue.messages.push(message);

        await this.save(character.aid);
        return message;
    }

    static async retrieveRewardItems(character, mail) {
        const dialogues = await this.get(character.aid);

        for (let d = 0, length = dialogues.length; d < length; d++) {
            const dialogue = dialogues[d];
            for (const message of dialogue.messages) {
                if (Object.keys(message.items).length === 0 || message._id !== mail.fromOwner.id)
                    continue;

                const familyIds = await Item.findAndReturnChildrenAsIds(mail.item, message.items.data);
                const output = [];

                message.items.data = await this.filterRewardItemsData(output, message, familyIds);

                if (message.items.data.length === 0)
                    message.items = {};
                if (dialogue.attachmentsNew > 0)
                    dialogue.attachmentsNew -= 1;
                return output;

            };
        }
    }

    static async filterRewardItemsData(output, message, familyIds) {
        return message.items.data.filter(reward => {
            if (!familyIds.includes(reward._id))
                return reward;
            output.push(reward)
        });
    }
}
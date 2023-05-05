import { database } from "../../app.mjs";
import { Account } from "./Account.mjs";
import { Locale } from "./Locale.mjs";
import { Trader } from "./Trader.mjs";
import { Item } from "./Item.mjs";

import {
    stringify, fileExist, write,
    getFileUpdatedDate, logger,
    generateMongoID, getCurrentTimestamp, readParsed
} from "../utilities/_index.mjs";

const MESSAGE_TYPES = {
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
};

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

    static activeMessages(sessionID, dialogue) {
        const time = getCurrentTimestamp();
        const dialog = this.getById(sessionID, dialogue._id);
        return dialog.messages.filter(({ dt, maxStorageTime }) => time < dt + maxStorageTime);
    }

    static messagesWithAttachments(sessionID, dialogue) {
        const activeMessages = this.activeMessages(sessionID, dialogue);
        return activeMessages.filter(({ items }) => items?.data?.length > 0);
    }

    static hasMessagesWithRewards(dialogue) {
        return dialogue.messages.some(({ items }) => items?.data?.length > 0);
    }

    static getAttachmentsNew(sessionID, dialogue) {
        let output = 0;
        const messages = this.activeMessages(sessionID, dialogue);
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
        const dialogues = database.profiles[sessionID]?.dialogues;
        if (!dialogues)
            return;

        const dialoguePath = this.getDialoguesPath(sessionID);
        const currentDialogues = stringify(dialogues);

        if (!await fileExist(dialoguePath)) {
            await write(dialoguePath, currentDialogues);
            database.fileAge[sessionID].dialogues = await getFileUpdatedDate(dialoguePath);

            logger.info(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} registered and saved to disk.`);
            return;
        }

        // Check if the memory content differs from the content on disk
        const savedDialogues = stringify(await readParsed(dialoguePath));
        if (currentDialogues !== savedDialogues) {
            await write(dialoguePath, currentDialogues);
            database.fileAge[sessionID].dialogues = await getFileUpdatedDate(dialoguePath);

            logger.info(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} saved to disk.`);
        } else
            logger.debug(`[DIALOGUE SAVE] Dialogues file for profile ${sessionID} save skipped!`);
    }

    static getMessageTypeByName(name) {
        return MESSAGE_TYPES[name];
    }

    static getUsersOfUserMessage(users, sessionId) {
        return users.filter(user => user._id !== sessionId);
    }

    static createMessageContent(locale, type, time) {
        return {
            templateId: locale, //is description for whatever reason
            type: type, //start
            maxStorageTime: time * 3600
        };
    }

    static createPlayerDialogue(dialogId, sessionID, message = [], users = []) {
        const dialogue = this.getById(sessionID, dialogId) || {
            attachmentsNew: 0,
            new: 0,
            type: 1,
            Users: users,
            pinned: false,
            messages: message,
            _id: sessionID
        };

        dialogue.new++;
        database.profiles[sessionID].dialogues[dialogId] = dialogue;
        return dialogue;
    }


    static playerMessageForMessageSend(text, uid) {
        return {
            _id: generateMongoID(),
            uid: uid,
            type: 1,
            dt: getCurrentTimestamp(),
            text: text,
            hasRewards: false
        };
    }

    static playerMessageForDialogList(message) {
        return {
            dt: message.dt,
            type: 1,
            text: message.text,
            uid: message.uid
        };
    }

    static traderMessageForDialogList(message) {
        return {
            dt: message.dt,
            type: message.type,
            text: message.text,
            uid: message.uid,
            templateId: message.templateId
        };
    }

    static generateQuestDialogMessage(character, quest, rewards, dialogueType, text) {
        const { lang } = Account.getWithSessionId(character.aid);
        const locale = Locale.getQuestLocales(lang, quest._id);

        const messageContent = this.createMessageContent(
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

    static createDialogue(dialogId, character) {
        const profile = database.profiles[character.aid];
        const dialogue = profile.dialogues[dialogId] || {
            attachmentsNew: 0,
            new: 0,
            pinned: false,
            messages: [],
            _id: dialogId
        };

        dialogue.new++;
        profile.dialogues[dialogId] = dialogue;
        return dialogue;
    }

    static generateMailDialogListDialogue(dialogue, sessionId = null) {
        const { attachmentsNew, new: newMessages, pinned, _id } = dialogue;
        const output = {
            attachmentsNew: attachmentsNew,
            new: newMessages,
            type: 0,
            pinned: pinned,
            message: {},
            _id: _id
        };

        if (!dialogue.type && Trader.getAll()[_id])
            output.type = 2;
        else
            output.type = dialogue.type;

        const message = dialogue.messages[dialogue.messages.length - 1];
        if (message.type === 1) {
            output.attachmentsNew = 0;
            output.Users = this.getUsersOfUserMessage(dialogue.Users, sessionId);
            output.message = this.playerMessageForDialogList(message);
        } else {
            output.message = this.traderMessageForDialogList(message);
        }

        return output;
        /*         const output = {
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
                    output.Users = this.getUsersOfUserMessage(dialogue.Users, sessionId);
                    output.message = this.playerMessageForDialogList(message);
                } else {
                    output.message = this.traderMessageForDialogList(message);
                }
        
                return output; */
    }

    static createMessageContents(traderID, message, rewards, items) {
        const output = {
            _id: generateMongoID(),
            uid: traderID,
            type: message.type,
            dt: getCurrentTimestamp(),
            templateId: message.templateId,
            text: message.text ?? "",
            rewardCollected: false,
            hasRewards: false,
            items: items,
            maxStorageTime: message.maxStorageTime
        };

        switch (message.type) {
            case 10:
                output.text = "quest started";
                break;
            case 11:
                output.text = "quest failed";
                break;
            case 12:
                output.text = "quest success";
                break;
        }

        if (message.systemData) {
            output.systemData = message.systemData;
        }
        if (!message.profileChangeEvents?.length) {
            output.profileChangeEvents = message.profileChangeEvents;
        }

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
        const dialogue = this.createDialogue(traderID, character);

        const items = {};
        if (rewards?.length > 0) {
            items.stash = generateMongoID();

            // this function doesn't exists....
            const dialogueItems = await this.generateDialogueItems(rewards, items.stash, quest);
            if (dialogueItems)
                items.data = dialogueItems;

            dialogue.attachmentsNew += 1;
        }

        const message = this.createMessageContents(traderID, contents, rewards, items);
        dialogue.messages.push(message);

        await Account.save(character.aid);
        return message;
    }

    static async generateDialogueItems(rewards, itemstashId, quest) {
        for (const reward of rewards) {
            if (!quest) {
                reward._id = generateMongoID();
            }

            if (!reward.slotId || reward.slotId === "hideout") {
                reward.parentId = itemstashId;
                reward.slotId = "main";
            }
        }

        return rewards;
    }

    static retrieveRewardItems(character, mail) {
        const dialogues = this.get(character.aid);

        for (let d = 0, length = dialogues.length; d < length; d++) {
            const dialogue = dialogues[d];
            for (const message of dialogue.messages) {
                if (Object.keys(message.items).length === 0 || message._id !== mail.fromOwner.id)
                    continue;

                const familyIds = Item.findAndReturnChildrenAsIds(mail.item, message.items.data);
                const output = this.filterRewardItemsData([], message, familyIds);

                if (message.items.data.length === 0)
                    message.items = {};
                if (dialogue.attachmentsNew > 0)
                    dialogue.attachmentsNew -= 1;
                return output;

            };
        }
    }

    static filterRewardItemsData(output, message, familyIds) {
        return message.items.data.filter(reward => {
            if (!familyIds.includes(reward._id))
                return reward;
            output.push(reward);
        });
    }
}

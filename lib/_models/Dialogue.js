const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Trader } = require("./Trader")
//const { logger, generateMongoID, getCurrentTimestamp } = require("../utilities/index.mjs");


class Dialogue extends BaseModel {
    constructor(id) {
        super(id);
        this.createDatabase(id);
    }

    static messageType = {
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

    static async generateDialogueModel(dialogue) {
        const { UtilityModel: { createModelFromParse } } = require("./UtilityModel");
        return createModelFromParse("Dialogue", dialogue);
    }

    static async getMessageTypeByName(name) {
        return this.messageType[name];
    }

    static async generateMailDialogListDialogue(dialogue, sessionId = null) {
        const output = await this.generateDialogueModel({
            attachmentsNew: dialogue.attachmentsNew,
            new: dialogue.new,
            type: 0,
            Users: [],
            pinned: dialogue.pinned,
            message: {},
            _id: dialogue._id
        })

        if (!dialogue.type) {
            const traderIDs = Object.keys(await Trader.getAll());
            if (traderIDs.includes(dialogue._id)) output.type = 2;
        }
        else output.type = dialogue.type;

        const message = dialogue.messages[dialogue.messages.length - 1];
        if (message.type === 1) {
            output.attachmentsNew = 0;
            output.Users = await this.getUsersOfUserMessage(dialogue.Users, sessionId);
            output.message = await this.playerMessageForDialogList(message);
        } else {
            delete output.Users;
            output.message = await this.traderMessage(message);
        }

        return output;
    }

    static async getUsersOfUserMessage(users, sessionId) {
        const output = []
        for (const user of users) {
            if (user._id !== sessionId) output.push(user);
        }
        return output;
    }

    static async traderMessage(message) {
        return {
            dt: message.dt,
            type: message.type,
            text: message.text,
            uid: message.uid,
            templateId: message.templateId,

        }
    }

    async playerMessageForMessageSend(text, uid) {
        const id = await generateMongoID();
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

    async createMessageContent(locale, type, time) {
        return {
            templateId: locale, //is description for whatever reason
            type: type, //start
            maxStorageTime: time * 3600
        };
    }

    /**
     * Returns "address" of mail sender based on uid
     * If shared messages between people, get iterate through list of unique uids
     * @param {string} uid 
     * @returns {<Promise>object}
     */
    async returnAddressOfMailSender(uid) {
        const { Profile } = require("./Profile");
        const { Info: { Nickname, Side, Level, MemberCategory } } = await Profile.get(uid);
        return {
            _id: uid,
            Info: {
                Nickname: Nickname,
                Side: Side,
                Level: Level,
                MemberCategory: MemberCategory
            }
        }
    }

    /**
    * Add dialogue to character, then send notification
    * @param {string} traderID 
    * @param {object} contents 
    * @param {array} rewards 
    * @param {string} sessionID 
    */
    async generateTraderDialogue(traderID, contents, sessionID, rewards = undefined, quest = undefined) {
        const { Profile } = require("./Profile");
        const profile = await Profile.get(sessionID);

        const dialogue = await this.createDialogue(traderID, profile);

        const items = {};
        if (rewards && rewards.length > 0) {
            items["stash"] = await generateMongoID();
            items["data"] = await this.generateDialogueItems(rewards, items.stash, quest)

            if (items.data.length === 0) delete items.data;
            dialogue.attachmentsNew += 1;
        }

        const message = await this.createMessageContents(traderID, contents, rewards, items);
        dialogue.messages.push(message);

        await profile.saveDialogue();
        return message;
    }

    async createDialogue(dialogId, profile) {
        let dialogue = await profile.dialogues[dialogId];
        if (!dialogue) {
            dialogue = await Dialogue.generateDialogueModel({
                attachmentsNew: 0,
                new: 0,
                pinned: false,
                messages: [],
                _id: dialogId
            });
        }
        dialogue.new += 1;
        profile.dialogues[dialogId] = dialogue;
        return dialogue;
    }

    static async createPlayerDialogue(dialogId, _id, profile) {
        let dialogue = await profile.dialogues[dialogId];
        if (!dialogue) {
            dialogue = await Dialogue.generateDialogueModel({
                attachmentsNew: 0,
                new: 0,
                type: 1,
                Users: [],
                pinned: false,
                messages: [],
                _id: _id
            });
        }
        dialogue.new += 1;
        profile.dialogues[dialogId] = dialogue;
        return dialogue;
    }

    async createMessageContents(traderID, message, rewards, items) {
        const id = await generateMongoID();
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

        if (message.type === 10) output.text = "quest started";
        if (message.type === 11) output.text = "quest failed";
        if (message.type === 12) output.text = "quest success";
        if (rewards !== null) output.hasRewards = (rewards.length > 0);
        if (message.systemData) output["systemData"] = message.systemData;
        if (message.profileChangeEvents ||
            message.profileChangeEvents?.length == 0) output["profileChangeEvents"] = message.profileChangeEvents;

        return output;
    }

    async generateDialogueItems(rewards, itemstashId, quest) {
        const output = [];
        for (const reward of rewards) {
            if (!quest)
                reward._id = await generateMongoID();
            if (!("slotId" in reward) || reward.slotId === "hideout") {
                reward.parentId = itemstashId;
                reward.slotId = "main"
            }

            const newReward = await Item.generateItemModel(reward);
            output.push(newReward);
        }
        return output;
    }

    async activeMessages() {
        const time = getCurrentTimestamp();
        return this.messages.filter(message => time < (message.dt + message.maxStorageTime))
    }

    async messagesWithAttachments() {
        const activeMessages = await this.activeMessages();
        return activeMessages.filter(message => message.items?.data?.length > 0);
    }

    async getAttachmentsNew() {
        let output = 0;
        const messages = await this.activeMessages();
        messages.forEach(message => {
            if (message.hasRewards && !message.rewardCollected) output++;
        });
        return output;
    }

    async hasMessagesWithRewards() {
        return this.messages.some(message => message.items?.data?.length > 0);
    }

}

module.exports.Dialogue = Dialogue;
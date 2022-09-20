const { BaseModel } = require("./BaseModel");
const {
    FastifyResponse, logger, generateMongoID, getCurrentTimestamp
} = require("../../utilities");
const { Item } = require("./Item");

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
};

class Dialogue extends BaseModel {
    constructor(id) {
        super(id);
        this.createDatabase(id);
    }

    static async getMessageTypeByName(name) {
        return messageType[name];
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
    async generateDialogue(traderID, contents, sessionID, rewards = undefined, quest = undefined) {
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
        return message;
    }

    async createDialogue(traderID, profile) {
        let dialogue = await profile.getDialogue(traderID);
        if (!dialogue) {
            dialogue = {
                _id: traderID,
                messages: [],
                pinned: false,
                new: 0,
                attachmentsNew: 0

            };
        }
        dialogue.new += 1;
        profile.dialogues[traderID] = dialogue;
        return dialogue;
    }

    async createMessageContents(traderID, message, rewards, items) {
        const output = {
            _id: await generateMongoID(),
            uid: traderID,
            type: message.type,
            dt: await getCurrentTimestamp(),
            templateId: message.templateId,
            text: message.text ?? "",
            rewardCollected: false,
            hasRewards: false,
            items: items,
            maxStorageTime: message.maxStorageTime
        };

        if (rewards !== null) output.hasRewards = (rewards.length > 0);
        if (message.systemData) output["systemData"] = message.systemData;
        if (message.profileChangeEvents ||
            message.profileChangeEvents?.length == 0) output["profileChangeEvents"] = message.profileChangeEvents;

        return output;
    }

    async generateDialogueItems(rewards, itemstashId, quest) {
        const output = [];
        for (const reward of rewards) {
            if (!quest) reward._id = await generateMongoID();
            if (!("slotId" in reward) || reward.slotId === "hideout") {
                reward.parentId = itemstashId;
                reward.slotId = "main"
            }
            output.push(reward);
        }
        return output;
    }

    static async hasMessagesWithRewards(messages) {
        return messages.some(x => x.hasRewards && x.items?.data?.length > 0 && !x.rewardCollected);
    }

}

module.exports.Dialogue = Dialogue;
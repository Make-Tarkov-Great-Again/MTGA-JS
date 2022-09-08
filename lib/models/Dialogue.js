const { BaseModel } = require("./BaseModel");
const {
    logger, generateMongoID, getCurrentTimestamp
} = require("../../utilities");

class Dialogue extends BaseModel {
    constructor(id) {
        super(id);
        this.createDatabase(id);
    }

    async createMessageContent(locale, type, time) {
        return {
            templateId: locale, //is description for whatever reason
            type: type, //start
            maxStorageTime: time * 3600
        };
    }


    /**
    * Add dialogue to character, then send notification
    * @param {string} traderID 
    * @param {object} contents 
    * @param {array} rewards 
    * @param {string} sessionID 
    */
    async generateDialogue(traderID, contents, sessionID, rewards = undefined) {
        const { Profile } = require("./Profile");
        const profile = await Profile.get(sessionID);

        const dialogue = await this.createDialogue(traderID, profile);

        const items = {};
        if (rewards && rewards.length > 0) {
            items["stash"] = await generateMongoID();
            items["data"] = await this.generateDialogueItems(rewards, items.stash)

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
        if (message.systemData) output.systemData = message.systemData;
        if (message.text) output.text = message.text;
        if (message.profileChangeEvents ||
            message.profileChangeEvents?.length == 0) output.profileChangeEvents = message.profileChangeEvents;

        return output;
    }

    async generateDialogueItems(rewards, itemsID) {
        const output = [];
        for (const reward of rewards) {
            reward._id = await generateMongoID();
            if (!("slotId" in reward) || reward.slotId === "hideout") {
                reward.parentId = itemsID;
                reward.slotId = "main"
            }
            output.push(reward)
        }
        return output;
    }

}

module.exports.Dialogue = Dialogue;
const { Quest } = require('../models/Quest');
const { Dialogue } = require('../models/Dialogue');
const { Item } = require('../models/Item')
const { min, findAndChangeHandoverItemsStack } = require("../utilities");


// QuestController
class QuestController {

    static async questActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "QuestAccept":
                return this.acceptQuest(moveAction, playerProfile);
            case "QuestHandover":
                return this.handoverQuest(moveAction, playerProfile);
            case "QuestComplete":
                return this.completeQuest(moveAction, playerProfile);
        }
    }

    static async acceptQuest(moveAction, playerProfile) {
        const output = {};
        const quest = await Quest.get(moveAction.qid);
        const questReward = await quest.processQuestRewards(output, playerProfile.character, "Started");
        playerProfile.character.Quests.push(await quest.generateQuestForCharacter(quest));


        const generatedDialogue = await Dialogue.generateDialogueModel(
            await quest.generateQuestDialogMessage(
                playerProfile.character,
                questReward,
                await Dialogue.getMessageTypeByName("QuestStart"),
                "description"
            )
        );

        await playerProfile.sendNotificationMessage(generatedDialogue, playerProfile.character.aid);

        await quest.setUnlockedBasedOnStatus(output, playerProfile.character, "Started");
        await playerProfile.save();
        return output;
    }

    static async handoverQuest(moveAction, playerProfile) {
        const { conditions } = await Quest.get(moveAction.qid); //get conditions from quest
        const condition = conditions.AvailableForFinish.find( // find and return _props
            c => c._props.id === moveAction.conditionId)._props;

        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };

        const handoverValue = (Number(condition.value) - ( // subtract character quest value from condition value
            (playerProfile.character.BackendCounters[condition.id]) ? //check if condition exists, return value or 0
                playerProfile.character.BackendCounters[condition.id].value : 0))

        if (handoverValue <= 0) return output;

        let counter = 0;
        let amountToRemove = 0;

        for (const handover of moveAction.items) {
            amountToRemove = await min(handover.count, handoverValue - counter);
            counter += amountToRemove;

            if (handover.count - amountToRemove > 0) {
                await findAndChangeHandoverItemsStack(
                    playerProfile.character,
                    handover.id,
                    (handover.count - amountToRemove),
                    output);

                if (counter === handoverValue) break;
            } else {
                const remove = await Item.findAndReturnChildrenAsIds(handover.id, playerProfile.character.Inventory.items);
                let length = playerProfile.character.Inventory.items.length;

                output.items.del.push({
                    "_id": handover.id
                });

                while (length-- > 0) {
                    if (remove.includes(playerProfile.character.Inventory.items[length]._id)) {
                        playerProfile.character.Inventory.items.splice(length, 1);
                    }
                }
            }
        }

        await playerProfile.updateBackendCounters(moveAction.conditionId, moveAction.qid, counter);
        return output;
    }

    static async completeQuest(moveAction, playerProfile) {
        const output = {};

        const questData = await Quest.get(moveAction.qid);

        const character = await playerProfile.getPmc();
        const characterQuest = await character.getQuest(moveAction.qid);
        await character.updateQuest(moveAction.qid, "Success");


        const rewards = await questData.processQuestRewards(output, character, characterQuest.status)
        const failedQuests = await questData.findAndReturnFailedQuestsUponQuestComplete(moveAction.qid);
        if (failedQuests !== 0) await questData.processFailedQuests(output, character, failedQuests);

        const generatedDialogue = await Dialogue.generateDialogueModel(await questData.generateQuestDialogMessage(
            character, rewards, await Dialogue.getMessageTypeByName("QuestSuccess"), "successMessageText"));

        await playerProfile.sendNotificationMessage(generatedDialogue, character.aid);
        await questData.processQuestListForOutput(output, await Quest.getQuestsForPlayer(playerProfile));

        await playerProfile.save();
        return output;
    }
}
module.exports.QuestController = QuestController;
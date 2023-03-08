import { Notification, Quest, Dialogues, Item, Character } from "../classes/_index.mjs";
import { min, findAndChangeHandoverItemsStack, getCurrentTimestamp } from "../utilities/_index.mjs";


export class QuestController {
    static async questActions(moveAction, character, characterChanges) {
        switch (moveAction.Action) {
            case "QuestAccept":
                return this.acceptQuest(character, characterChanges, moveAction);
            case "QuestHandover":
                return this.handoverQuest(character, characterChanges, moveAction);
            case "QuestComplete":
                return this.completeQuest(character, characterChanges, moveAction);
        }
    }

    static async acceptQuest(character, characterChanges, moveAction) {
        const output = {};
        const quest = Quest.getQuestById(moveAction.qid);
        const questReward = await Quest.processQuestRewards(output, quest, character, "Started");

        const generatedDialogue = await Dialogues.generateQuestDialogMessage(
            character,
            quest,
            questReward,
            await Dialogues.getMessageTypeByName("QuestStart"),
            "description"
        );

        await Notification.sendNotificationMessage(character.aid, generatedDialogue);
        await Quest.setUnlockedBasedOnStatus(characterChanges, character, quest, "Started");

        character.Quests.push({
            qid: quest._id,
            startTime: getCurrentTimestamp(),
            status: "Started",
            statusTimers: {}
        });
    }

    static async handoverQuest(character, characterChanges, moveAction) {
        const { conditions } = Quest.getQuestById(moveAction.qid); //get conditions from quest
        const condition = conditions.AvailableForFinish.find( // find and return _props
            c => c._props.id === moveAction.conditionId)._props;

        const backendCounter = await Character.getBackendCounter(character, condition.id);
        const handoverValue = (Number(condition.value) - (backendCounter ? backendCounter.value : 0))

        if (handoverValue <= 0)
            return;

        let counter = 0;
        let amountToRemove = 0;

        for (const handover of moveAction.items) {
            amountToRemove = min(handover.count, handoverValue - counter);
            counter += amountToRemove;

            if ((handover.count - amountToRemove) > 0) {
                await findAndChangeHandoverItemsStack(
                    character,
                    handover.id,
                    (handover.count - amountToRemove),
                    characterChanges);

                if (counter === handoverValue)
                    break;
            } else {
                const remove = await Item.findAndReturnChildrenAsIds(handover.id, character.Inventory.items);
                let length = character.Inventory.items.length;

                characterChanges.items.del.push({
                    "_id": handover.id
                });

                while (length-- > 0) {
                    if (remove.includes(character.Inventory.items[length]._id)) {
                        character.Inventory.items.splice(length, 1);
                    }
                }
            }
        }
        await Character.updateBackendCounters(character, moveAction.conditionId, moveAction.qid, counter);
    }

    static async completeQuest(character, characterChanges, moveAction) {
        const output = {};

        //const questData = await Quest.get(moveAction.qid);
        const characterQuest = await Character.getQuest(moveAction.qid);
        await Character.updateQuest(moveAction.qid, "Success");


        const rewards = await Quest.processQuestRewards(output, character, characterQuest.status)
        const failedQuests = await Quest.findAndReturnFailedQuestsUponQuestComplete(moveAction.qid);
        if (failedQuests !== 0)
            await Quest.processFailedQuests(characterChanges, character, Quest.getQuestById(moveAction.qid), failedQuests);

        const generatedDialogue = await Dialogues.generateQuestDialogMessage(
            character,
            rewards,
            await Dialogues.getMessageTypeByName("QuestSuccess"),
            "successMessageText");

        await Notification.sendNotificationMessage(character.aid, generatedDialogue);
        await Quest.processQuestListForOutput(characterChanges, await Quest.getQuestsForPlayer(playerProfile));

        return output;
    }
}
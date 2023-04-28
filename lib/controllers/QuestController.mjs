import { Notification, Quest, Dialogues, Item, Character, Inventory } from "../classes/_index.mjs";
import { getCurrentTimestamp } from "../utilities/_index.mjs";


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

        const generatedDialogue = Dialogues.generateQuestDialogMessage(
            character,
            quest,
            questReward,
            Dialogues.getMessageTypeByName("QuestStart"),
            "description"
        );

        Notification.sendNotificationMessage(character.aid, generatedDialogue);
        Quest.setUnlockedBasedOnStatus(characterChanges, character, quest, "Started");

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
            amountToRemove = Math.min(handover.count, handoverValue - counter);
            counter += amountToRemove;

            if ((handover.count - amountToRemove) > 0) {

                Inventory.findAndChangeHandoverItemsStack(

                    character.Inventory,
                    handover.id,
                    (handover.count - amountToRemove),
                    characterChanges);

                if (counter === handoverValue)
                    break;
            } else {
                const remove = Item.findAndReturnChildrenAsIds(handover.id, character.Inventory.items);
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
        Character.updateBackendCounters(character, moveAction.conditionId, moveAction.qid, counter);
    }

    static async completeQuest(character, characterChanges, moveAction) {
        const output = {};

        //const questData = await Quest.get(moveAction.qid);
        const characterQuest = Character.getQuest(moveAction.qid);
        Character.updateQuest(moveAction.qid, "Success");


        const rewards = Quest.processQuestRewards(output, character, characterQuest.status);
        const failedQuests = Quest.findAndReturnFailedQuestsUponQuestComplete(moveAction.qid);
        if (failedQuests !== 0)
            Quest.processFailedQuests(characterChanges, character, Quest.getQuestById(moveAction.qid), failedQuests);

        const generatedDialogue = Dialogues.generateQuestDialogMessage(
            character,
            rewards,
            Dialogues.getMessageTypeByName("QuestSuccess"),
            "successMessageText");

        Notification.sendNotificationMessage(character.aid, generatedDialogue);
        await Quest.filterQuestConditions(characterChanges, await Quest.getQuestsForPlayer(playerProfile));

        return output;
    }
}
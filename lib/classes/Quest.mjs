import { database } from "../../app.mjs";

import { cloneDeep, logger } from "../utilities/_index.mjs";
import { Character } from "./Character.mjs";
import { Dialogues } from "./Dialogues.mjs";
import { Notification } from "./Notification.mjs";

const questStatus = {
    "Locked": 0,
    "AvailableForStart": 1,
    "Started": 2,
    "AvailableForFinish": 3,
    "Success": 4,
    "Fail": 5,
    "FailRestartable": 6,
    "MarkedAsFailed": 7
};


export class Quest {

    static getAllQuests() {
        return database.quests;
    }

    static getQuestById(questID) {
        if (!database.quests[questID]) {
            logger.error(`Quest by ${questID} does not exist, check if valid!`);
            return false;
        }
        return database.quests[questID];
    }

    static async getQuestsForPlayer(sessionID) {
        const output = [];
        const quests = this.getAllQuests();
        const character = Character.get(sessionID);

        for (const questId in quests) {
            const quest = quests[questId];
            if (this.questForOtherFaction(character.Info.Side, questId))
                continue;

            if (character.Quests.some(q => q.qid === questId)) {
                output.push(quest);
                continue;
            }

            const startLevel = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Level");
            if (startLevel.length && !await this.evaluateLevel(character, startLevel[0])) {
                continue;
            }

            const finishLevel = await this.filterQuestConditions(quest.conditions.AvailableForFinish, "Level");
            if (finishLevel.length && !await this.evaluateLevel(character, finishLevel[0])) {
                continue;
            }

            const questRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Quest");
            const loyaltyRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "TraderLoyalty");

            if (questRequirements.length === 0 && loyaltyRequirements.length === 0) {
                output.push(quest);
                continue;
            }

            if (this.checkQuestsRequirements(character, questRequirements, loyaltyRequirements)) {
                const clean = await this.cleanQuestConditions(quest);
                output.push(clean);
            }
        }
        return output;
    }

    /**
     * Check quests requirements:
     * - previous quests status,
     * - loyalty requirements
     */
    static checkQuestsRequirements(character, questRequirements, loyaltyRequirements) {
        for (const condition of questRequirements) {
            const previousQuest = character.Quests.find(pq => pq.qid === condition._props.target);

            if (!previousQuest)
                return false;
            const status = this.getQuestStatusNameByStatusInt(condition._props.status[0]);
            if (previousQuest.status !== status) {
                return false;
            }
            break;
        }
        for (const condition of loyaltyRequirements) {
            if (!this.checkLoyaltyReq(character, condition))
                return false;
        }
        return true;
    }

    /**
    * Return index (name) of Quest Status via their value
    * @param {int} statusInt 0-7
    * @returns {<Promise> string}
    */
    static getQuestStatusNameByStatusInt(statusInt) {
        for (const name in questStatus) {
            if (questStatus[name] === statusInt)
                return name;
        }
        return false;
    }

    static questForOtherFaction(side, qid) {
        return (side === "Bear" && ["6179b5eabca27a099552e052", "5e381b0286f77420e3417a74"].includes(qid))
            || (side !== "Bear" && ["6179b5b06e9dd54ac275e409", "5e383a6386f77465910ce1f3"].includes(qid));
    }

    static async cleanQuestConditions(quest) {
        quest = await cloneDeep(quest);
        quest.conditions.AvailableForStart = quest.conditions.AvailableForStart.filter(q => q._parent === "Level");

        return quest;
    };

    static async filterQuestConditions(quest, type) {
        return quest.filter(c => c._parent === type);
    }

    static evaluateLevel(character, condition) {
        const level = character.Info.Level;
        if (condition._parent !== "Level")
            return false;
        if (condition._props.compareMethod === ">=")
            return level >= condition._props.value;
        else {
            logger.warn(`Unrecognised Comparison Method: ${condition._props.compareMethod}`);
            return false;
        }
    }

    static async checkLoyaltyReq(character, condition) {
        const currentLoyalty = await Character.getLoyalty(character, condition._props.target);
        switch (condition._props.compareMethod) {
            case ">=":
                return currentLoyalty >= condition._props.value;
            case "<=":
                return currentLoyalty <= condition._props.value;
            case "==":
                return currentLoyalty === condition._props.value;
            case "!=":
                return currentLoyalty !== condition._props.value;
            case ">":
                return currentLoyalty > condition._props.value;
            case "<":
                return currentLoyalty < condition._props.value;
            default:
                return false;
        }
    };

    static async findAndReturnFailedQuestsUponQuestComplete(id) {
        const quests = this.getAllQuests();
        return quests.filter((quest) => {
            if (!quest.conditions.Fail || quest.conditions.Fail.length === 0) return false;
            quest.conditions.Fail.find(condition => {
                if (condition._props.target === id)
                    return quest;
            });
        });
    }

    static async processFailedQuests(characterChanges, character, quest, failures) {
        const currentTime = getCurrentTimestamp();
        for (const failure of failures) {
            if (await Character.getQuest(character, failure._id)) {
                await this.failQuest(
                    characterChanges,
                    character,
                    quest,
                    {
                        Action: "QuestComplete",
                        qid: failure._id,
                        removeExcessItems: true
                    }
                );
            } else {
                character.Quests.push({
                    qid: failure._id,
                    startTime: currentTime,
                    status: "Fail"
                });
            }
        }
    }

    static async failQuest(characterChanges, character, quest, failure) {
        await Character.updateQuest(character, failure.qid, "Fail");
        const questReward = this.processQuestRewards(characterChanges, quest, character, "Fail");
        const generatedDialogue = await Dialogues.generateQuestDialogMessage(
            character,
            quest,
            questReward,
            await Dialogues.getMessageTypeByName("QuestFail"),
            "failMessageText"
        );

        await Notification.sendNotificationMessage(character.aid, generatedDialogue);
        await this.setUnlockedBasedOnStatus(characterChanges, character, quest, "Failed");
    };

    /**
    * Adjust output for profiles changes that get sent to client,
    * return item rewards with new IDs to be sent as notification to player
    * @param {object} character
    * @param {string} status
    * @returns {<Promise>array}
    */
    static async processQuestRewards(characterChanges, quest, character, status) {
        if (quest.rewards[status].length === 0) return []; //return early if empty

        const rewards = [];
        for (const reward of quest.rewards[status]) {
            switch (reward.type) {
                case "Skill":
                    logger.info(`Processing ${reward.type} Quest Reward`);

                    await this.processSkillPoints(characterChanges, character, reward.target, reward.value);

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "Experience":
                    logger.info(`Processing ${reward.type} Quest Reward`);

                    await Character.addExperience(character.aid, Number(reward.value));
                    await Character.setLevel(character.aid);
                    characterChanges.experience = character.Info.Experience;

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "TraderStanding":
                    logger.info(`Processing ${reward.type} Quest Reward`);

                    await this.processTraderStanding(characterChanges, character, reward.target, Number(reward.value));

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "TraderUnlock":
                    logger.info(`Processing ${reward.type} Quest Reward`);

                    character.TradersInfo[reward.target].unlocked = true;

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "Item":
                    logger.info(`Processing ${reward.type} Quest Reward`);

                    rewards.push(
                        ...await this.processItemRewards(
                            reward,
                            await Character.getIntelCenterBonus(character.aid)
                        )
                    );

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "AssortmentUnlock":
                default:
                    logger.info(`${reward.type} of ${quest.QuestName}: ${quest.id} not handled`);
                    break;
            }
        }
        return rewards;
    }


    /**
    * Set trader standing progress for character, adjust output profile changes for client
    * @param {object} character
    * @param {string} traderId
    * @param {int} value
    * @param {object} output
    */
    static async processTraderStanding(characterChanges, character, traderId, value) {
        if ((character.TradersInfo[traderId].standing + value) < 0)
            character.TradersInfo[traderId].standing = 0;
        characterChanges.traderRelations = character.TradersInfo;
    }

    /**
    * Set new skill point progress for character, adjust output profile changes for client
    * @param {object} characterChanges
    * @param {object} character
    * @param {string} skillName
    * @returns
    */
    static async processSkillPoints(characterChanges, character, skillName, progressAmount) {
        const index = character.Skills.Common.findIndex(skill => skill.Id === skillName);
        if (index === -1) return;

        character.Skills.Common[index].Progress += progressAmount;
        character.Skills.Common[index].LastAccess = getCurrentTimestamp();
        characterChanges.skills.Common[index].Progress = character.Skills.Common[index].Progress;
        characterChanges.skills.Common[index].LastAccess = character.Skills.Common[index].LastAccess;
    }

    static async setUnlockedBasedOnStatus(characterChanges, character, quest, status) {
        const allQuests = Object.values(this.getAllQuests());
        const quests = allQuests.filter((q) => {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c => {
                    return c._parent === "Quest" &&
                        c._props.target === quest._id &&
                        c._props.status[0] === quest.questStatus[status];
                });

            if (!acceptedQuestCondition) return false;
            const profileQuest = character.Quests.find(pq => pq.qid === quest._id);
            return profileQuest && (profileQuest.status === status);
        });

        for (const quest of quests) {
            characterChanges.quests.push(await this.cleanQuestConditions(quest));
        }
    }
}

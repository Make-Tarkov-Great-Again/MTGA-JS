import { database } from "../../app.mjs";
import { logger } from "../utilities/_index.mjs";
import { Character } from "./Character.mjs";
import { Dialogues } from "./Dialogues.mjs";
import { Notification } from "./Notification.mjs";
import { Item } from "./Item.mjs";



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
        const completedQuests = new Set(character.Quests.map(q => q.qid));

        for (const questId in quests) {
            const quest = quests[questId];
            if (this.questForOtherFaction(character.Info.Side, questId))
                continue;

            if (completedQuests.has(quest._id)) {
                output.push(quest);
                continue;
            }

            const startLevel = this.filterQuestConditions(quest.conditions.AvailableForStart, "Level");
            if (startLevel.length && !this.evaluateLevel(character, startLevel[0])) {
                continue;
            }

            const finishLevel = this.filterQuestConditions(quest.conditions.AvailableForFinish, "Level");
            if (finishLevel.length && !this.evaluateLevel(character, finishLevel[0])) {
                continue;
            }

            const questRequirements = this.filterQuestConditions(quest.conditions.AvailableForStart, "Quest");
            const loyaltyRequirements = this.filterQuestConditions(quest.conditions.AvailableForStart, "TraderLoyalty");

            if (questRequirements.length === 0 && loyaltyRequirements.length === 0) {
                output.push(quest);
                continue;
            }

            if (this.checkQuestsRequirements(character, questRequirements, loyaltyRequirements)) {
                output.push(this.cleanQuestConditions(quest));
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
        // Check quest requirements
        const condition = questRequirements[0];
        if (!condition || condition?._props)
            return false;

        const previousQuest = character.Quests.find(pq => pq.qid === condition._props.target);
        if (!previousQuest || previousQuest.status !== this.getQuestStatusNameByStatusInt(condition._props.status[0])) {
            return false;
        }

        // Check loyalty requirements
        for (const condition of loyaltyRequirements) {
            if (!this.checkLoyaltyReq(character, condition))
                return false;
        }

        return true;

        /*         for (const condition of questRequirements) {
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
        return true; */
    }

    /**
    * Return index (name) of Quest Status via their value
    * @param {int} statusInt 0-7
    * @returns {string}
    */
    static getQuestStatusNameByStatusInt(statusInt) {
        for (const name in questStatus) {
            if (questStatus.hasOwnProperty(name) && questStatus[name] === statusInt) {
                return name;
            }
        }
        return null;
    }

    static questForOtherFaction(side, qid) {
        return (side === "Bear" && ["6179b5eabca27a099552e052", "5e381b0286f77420e3417a74"].includes(qid))
            || (side !== "Bear" && ["6179b5b06e9dd54ac275e409", "5e383a6386f77465910ce1f3"].includes(qid));
    }

    static cleanQuestConditions(quest) {
        quest = { ...quest };
        quest.conditions.AvailableForStart = quest.conditions.AvailableForStart.filter(q => q._parent === "Level");

        return quest;
    };

    static filterQuestConditions(quest, type) {
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

    static checkLoyaltyReq(character, condition) {
        const currentLoyalty = Character.getLoyalty(character, condition._props.target);
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

    static findAndReturnFailedQuestsUponQuestComplete(id) {
        const quests = this.getAllQuests();
        return quests.filter((quest) => {
            if (!quest.conditions.Fail || quest.conditions.Fail.length === 0) return false;
            quest.conditions.Fail.find(condition => {
                if (condition._props.target === id)
                    return quest;
            });
        });
    }

    static processFailedQuests(characterChanges, character, quest, failures) {
        const currentTime = getCurrentTimestamp();
        for (const failure of failures) {
            if (Character.getQuest(character, failure._id)) {
                this.failQuest(
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

    static failQuest(characterChanges, character, quest, failure) {
        Character.updateQuest(character, failure.qid, "Fail");
        const questReward = this.processQuestRewards(characterChanges, quest, character, "Fail");
        const generatedDialogue = Dialogues.generateQuestDialogMessage(
            character,
            quest,
            questReward,
            Dialogues.getMessageTypeByName("QuestFail"),
            "failMessageText"
        );

        Notification.sendNotificationMessage(character.aid, generatedDialogue);
        this.setUnlockedBasedOnStatus(characterChanges, character, quest, "Failed");
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

        let rewards = [];
        for (const reward of quest.rewards[status]) {
            switch (reward.type) {
                case "Skill":
                    this.processSkillPoints(characterChanges, character, reward.target, reward.value);
                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "Experience":
                    Character.addExperience(character.aid, Number(reward.value));
                    Character.setLevel(character.aid);
                    characterChanges.experience = character.Info.Experience;

                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;
                case "TraderStanding":
                    this.processTraderStanding(characterChanges, character, reward.target, Number(reward.value));
                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;

                case "TraderUnlock":
                    character.TradersInfo[reward.target].unlocked = true;
                    logger.info(`Processed ${reward.type} Quest Reward`);
                    break;

                case "Item":
                    rewards.push(
                        ...this.processItemRewards(
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

    static processItemRewards(rewards, bonus) {
        const output = [];
        const items = rewards.items;

        if (items.length > 1) { // more than likely an item with children
            const newId = generateMongoID(); //generate new id so we avoid potential duplicates
            const children = this.processRewardChildren(items[0], items, newId) //create cloned children with new ids for same reason

            const parent = { ...items[0] }; //create cloned parent for same reason
            parent._id = newId;
            parent.upd = parent.upd || {};
            parent.upd.SpawnedInSession = true;

            output.push(parent, ...children); //push cloned rewards
        } else {
            for (const reward of items) {
                if (Item.checkIfTplIsMoney(reward._tpl) && bonus >= 1) {
                    //apply intelcenter boost
                    reward.upd.StackObjectsCount += round((rewards.value * bonus) / 100);
                }

                reward._id = generateMongoID();
                reward.upd = reward.upd || {};
                reward.upd.SpawnedInSession = true;

                output.push({ ...reward });
            }
        }
        return output;
    }

    // needs to be adjusted
    static processRewardChildren(parent, children, newId) {
        const output = [];
        for (const child of children) {

            if (child.parentId === parent._id) {
                //check if this item has children in the array
                const grandchildren = this.processRewardChildren(child, children, child._id);


                const item = { ...child };
                item._id = generateMongoID();
                item.parentId = newId;
                item.upd = item.upd || {};
                item.upd.SpawnedInSession = true;


                if (grandchildren) {
                    for (const grandchild of grandchildren) {
                        grandchild.parentId = item._id;
                        grandchild.upd = grandchild.upd || {};
                        grandchild.upd.SpawnedInSession = true;

                        output.push(grandchild);
                    }
                }
                output.push(item);
            }
        }
        return output.length > 0 ? output : false;
    }

    /**
    * Set trader standing progress for character, adjust output profile changes for client
    * @param {object} character
    * @param {string} traderId
    * @param {int} value
    * @param {object} output
    */
    static processTraderStanding(characterChanges, character, traderId, value) {
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
    static processSkillPoints(characterChanges, character, skillName, progressAmount) {
        const index = character.Skills.Common.findIndex(skill => skill.Id === skillName);
        if (index === -1) return;

        const skill = character.Skills.Common[index];
        skill.Progress += progressAmount;
        skill.LastAccess = getCurrentTimestamp();

        characterChanges.skills.Common[index].Progress = skill.Progress;
        characterChanges.skills.Common[index].LastAccess = skill.LastAccess;
    }

    static setUnlockedBasedOnStatus(characterChanges, character, quest, status) {
        const allQuests = this.getAllQuests();
        const quests = Object.keys(allQuests).filter(q => {
            const acceptedQuestCondition = allQuests[q].conditions.AvailableForStart.find(c =>
                c._parent === "Quest" &&
                c._props.target === quest._id &&
                c._props.status[0] === quest.questStatus[status]
            );

            if (!acceptedQuestCondition) return false;

            const profileQuest = character.Quests.find(pq => pq.qid === quest._id);
            return profileQuest && (profileQuest.status === status);
        }).map(q => this.cleanQuestConditions(allQuests[q]));

        characterChanges.quests.push(...quests);

        /*         const allQuests = Object.values(this.getAllQuests());
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
                    characterChanges.quests.push(this.cleanQuestConditions(quest));
                } */
    }

    static filterQuestsForOutput(output, playerQuests) {
        const allQuestIds = new Set(Object.keys(this.getAllQuests()));
        const filteredQuests = playerQuests.filter(quest => allQuestIds.has(quest._id));

        if (filteredQuests.length > 0) {
            output.quests = output.quests || [];
            output.quests.push(...filteredQuests);
        }
    }
}

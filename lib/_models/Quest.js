const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Account } = require("./Account");
const { Locale } = require("./Locale");
const { Dialogue } = require("./Dialogue");
//const { logger, getCurrentTimestamp, round, generateMongoID, cloneDeep } = require("../utilities/index.mjs").default;
/* const { database: { core: { gameplay: {
    quests: { repeatable },
    trading: { redeemTimeInHours }
} } } } = require('../../app');
 */

class Quest extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    static questStatus = {
        "Locked": 0,
        "AvailableForStart": 1,
        "Started": 2,
        "AvailableForFinish": 3,
        "Success": 4,
        "Fail": 5,
        "FailRestartable": 6,
        "MarkedAsFailed": 7
    };

    async generateQuestForCharacter(quest) {
        return {
            qid: quest._id,
            startTime: getCurrentTimestamp(),
            status: "Started",
            statusTimers: {}
        }
    }

/*     static async getQuestsForPlayer(playerProfile) {
        const output = [];
        const quests = await Quest.getAllWithoutKeys();

        for (const quest of quests) {

            if (await this.questForOtherFaction(playerProfile.character.Side, quest._id))
                continue;

            if (playerProfile.character.Quests.some(q => q.qid === quest._id)) {
                output.push(quest)
                continue;
            }

            const startLevel = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Level");
            if (startLevel.length) {
                if (!await this.evaluateLevel(playerProfile.character, startLevel[0]))
                    continue
            }

            const finishLevel = await this.filterQuestConditions(quest.conditions.AvailableForFinish, "Level");
            if (finishLevel.length) {
                if (!await this.evaluateLevel(playerProfile.character, finishLevel[0]))
                    continue
            }

            const questRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Quest");
            const loyaltyRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "TraderLoyalty");

            if (questRequirements.length === 0 && loyaltyRequirements.length === 0) {
                output.push(quest);
                continue;
            }

            let completedPreviousQuest = false;
            for (const condition of questRequirements) {
                const previousQuest = playerProfile.character.Quests.find(pq => pq.qid === condition._props.target);

                if (!previousQuest) break;
                const status = await this.getQuestStatusNameByStatusInt(condition._props.status[0])
                if (previousQuest.status == status) {
                    completedPreviousQuest = true;
                    continue;
                }
                break;
            }

            let loyalty = true;
            for (const condition of loyaltyRequirements) {
                if (!await this.checkLoyaltyReq(condition, playerProfile)) {
                    loyalty = false
                    break;
                }
            }
            if (completedPreviousQuest && loyalty) {
                const clean = await this.cleanQuestConditions(quest);
                output.push(clean);
            }

        }
        return output;
    } */

/*     static async questForOtherFaction(side, qid) {
        if (side === "Bear" && ["6179b5eabca27a099552e052", "5e381b0286f77420e3417a74"].includes(qid)) {
            return true;
        } else if (side !== "Bear" && ["6179b5b06e9dd54ac275e409", "5e383a6386f77465910ce1f3"].includes(qid)) {
            return true;
        }
        return false;
    } */

/*     static async cleanQuestsConditions(quests) {
        for (const quest in quests) {
            quests[quest] = await this.cleanQuestConditions(quests[quest]);
        }
        return quests;
    } */

/*     static async cleanQuestConditions(quest) {
        quest = await cloneDeep(quest);
        quest.conditions.AvailableForStart = quest.conditions.AvailableForStart.filter(q => q._parent === "Level");

        return quest;
    }; */

/*     static async checkLoyaltyReq(condition, playerProfile) {
        const currentLoyalty = await playerProfile.getLoyalty(condition._props.target)
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
        }
    }; */

    /**
     * Return index (name) of Quest Status via their value
     * @param {int} statusInt 0-7
     * @returns {<Promise> string}
     */
/*     static async getQuestStatusNameByStatusInt(statusInt) {
        for (const name in this.questStatus) {
            if (this.questStatus[name] === statusInt)
                return name;
        }
    } */

/*     static async filterQuestConditions(quest, type) {
        return quest.filter(c => {
            return c._parent === type;
        });
    } */

/*     async findAndReturnFailedQuestsUponQuestComplete(id) {
        const quests = await Quest.getAllWithoutKeys();
        return quests.filter((quest) => {
            if (!quest.conditions.Fail || quest.conditions.Fail.length === 0) return false;
            quest.conditions.Fail.find(condition => {
                if (condition._props.target === id)
                    return quest;
            });
        });
    } */

    async processFailedQuests(output, character, failures) {
        const currentTime = getCurrentTimestamp();
        for (const failure of failures) {
            if (await character.getQuest(failure._id)) {
                await this.failQuest(
                    output,
                    character,
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

    async failQuest(output, character, failure) {
        await character.updateQuest(failure.qid, "Fail");
        const questReward = await this.processQuestRewards(output, character, "Fail");
        const generatedDialogue = await this.generateQuestDialogMessage(
            character, questReward, await Dialogue.getMessageTypeByName("QuestFail"), "failMessageText");

        await character.sendNotificationMessage(generatedDialogue, character.aid);
        await this.setUnlockedBasedOnStatus(output, character, "Failed");
    };

    async setUnlockedBasedOnStatus(output, character, status) {
        const allQuests = await Quest.getAllWithoutKeys();
        const quests = allQuests.filter((q) => {
            const acceptedQuestCondition = q.conditions.AvailableForStart.find(
                c => {
                    return c._parent === "Quest" &&
                        c._props.target === this._id &&
                        c._props.status[0] === this.questStatus[status];
                });

            if (!acceptedQuestCondition) return false;
            const profileQuest = character.Quests.find(pq => pq.qid === this._id);
            return profileQuest && (profileQuest.status === status);
        });


        output.quests = await Quest.cleanQuestsConditions(quests);
    }

/*     static async evaluateLevel(character, condition) {
        const level = character.Info.Level;
        if (condition._parent === "Level") {
            if (condition._props.compareMethod == ">=")
                return level >= condition._props.value;
            else {
                logger.warn(`Unrecognised Comparison Method: ${condition._props.compareMethod}`);
                return false;
            }
        }
    } */

    /**
     * Adjust output for profiles changes that get sent to client, 
     * return item rewards with new IDs to be sent as notification to player
     * @param {object} output 
     * @param {object} character 
     * @param {string} status 
     * @returns {<Promise>array}
     */
    async processQuestRewards(output, character, status) {
        if (this.rewards[status].length === 0) return []; //return early if empty

        const rewards = [];
        for (const reward of this.rewards[status]) {
            switch (reward.type) {
                case "Skill":
                    logger.info("Skill");
                    await Quest.processSkillPoints(output, character, reward.target, reward.value)
                    break;
                case "Experience":
                    logger.info("Experience");
                    await character.addExperience(Number(reward.value))
                    await character.setLevel();
                    output.experience = await character.getExperience()
                    break;
                case "TraderStanding":
                    logger.info("TraderStanding");
                    await this.processTraderStanding(output, character, reward.target, Number(reward.value));
                    break;
                case "TraderUnlock":
                    logger.info("TraderUnlock");
                    character.TradersInfo[reward.target].unlocked = true;
                    break;
                case "Item":
                    logger.info("Item");
                    rewards.push(...await this.processItemRewards(reward, await character.getIntelCenterBonus()));
                    break;
                case "AssortmentUnlock":
                    logger.info("AssortmentUnlock");
                    break;
                default:
                    logger.info(`${reward.type} of ${this.QuestName}: ${this.id} not handled`);
                    break;
            }
        }
        return rewards;
    }

    /**
     * Set new skill point progress for character, adjust output profile changes for client
     * @param {object} output 
     * @param {object} character 
     * @param {string} skillName 
     * @returns 
     */
    static async processSkillPoints(output, character, skillName, progressAmount) {
        const index = character.Skills.Common.findIndex(skill => skill.Id === skillName);
        if (index === -1) return;

        character.Skills.Common[index].Progress += progressAmount;
        character.Skills.Common[index].LastAccess = getCurrentTimestamp();
        output.skills.Common[index].Progress = character.Skills.Common[index].Progress;
        output.skills.Common[index].LastAccess = character.Skills.Common[index].LastAccess;
    }

    /**
     * Set trader standing progress for character, adjust output profile changes for client
     * @param {object} character 
     * @param {string} traderId 
     * @param {int} value 
     * @param {object} output 
     */
    async processTraderStanding(output, character, traderId, value) {
        if ((character.TradersInfo[traderId].standing + value) < 0) character.TradersInfo[traderId].standing = 0;
        output.traderRelations = character.TradersInfo;
    }

    async processItemRewards(rewards, bonus) {
        const output = [];
        if (rewards.items.length > 1) { // more than likely an item with children
            const newId = await generateMongoID(); //generate new id so we avoid potential duplicates
            const children = await this.processRewardChildren(rewards.items[0], rewards.items, newId) //create cloned children with new ids for same reason

            const parent = await Item.generateItemModel(rewards.items[0]); //create cloned parent for same reason
            parent._id = newId //set new id after children are processed
            if (!parent.upd) parent.upd = {};
            parent.upd.SpawnedInSession = true;

            output.push(parent, ...children); //push cloned rewards
        } else for (const reward of rewards.items) {
            if (await Item.checkIfTplIsMoney(reward._tpl) && bonus >= 1) {
                //apply intelcenter boost
                reward.upd.StackObjectsCount += round((rewards.value * bonus) / 100);
            }
            reward._id = await generateMongoID();
            if (!reward.upd)
                reward.upd = {};
            reward.upd.SpawnedInSession = true;

            const newReward = await Item.generateItemModel(reward);
            output.push(newReward);
        }
        return output;
    }

    // needs to be adjusted
    async processRewardChildren(parent, children, newId) {
        const output = [];
        for (const child of children) {

            if (child.parentId === parent._id) {
                //check if this item has children in the array
                const grandchildren = await this.processRewardChildren(child, children, child._id);


                const item = await Item.generateItemModel(child);
                item._id = await generateMongoID();
                item.parentId = newId;

                if (!item.upd) item.upd = {};
                item.upd.SpawnedInSession = true;

                if (grandchildren) {
                    for (const grandchild of grandchildren) {
                        grandchild.parentId = item._id;

                        if (!grandchild.upd) grandchild.upd = {};
                        grandchild.upd.SpawnedInSession = true;

                        output.push(grandchild);
                    }
                }
                output.push(item);
            }
        }
        if (output.length > 0) return output;
        else return false;
    }

    /**
     * Push quest IDs for profile changes output for client
     * @param {*} output 
     * @param {*} playerQuests 
     */
    async processQuestListForOutput(output, playerQuests) {
        const allQuests = Object.keys(await Quest.getAllQuests());
        playerQuests.find(quest => {
            if (allQuests.includes(quest._id)) {
                if (!output.quests)
                    output.quests = [];
                output.quests.push(quest)
            }
        })
    }

    async generateQuestDialogMessage(character, questID, rewards, dialogueType, text) {
        const { lang } = await Account.get(character.aid);
        const locale = await Locale.getQuestLocales(lang, questID);

        const messageContent = await Dialogues.createMessageContent(
            locale[text],
            dialogueType,
            (redeemTimeInHours * 3600)
        );

        return dialogue.generateTraderDialogue(
            this.traderId,
            messageContent,
            character.aid,
            rewards,
            true
        );
    }
}
module.exports.Quest = Quest;
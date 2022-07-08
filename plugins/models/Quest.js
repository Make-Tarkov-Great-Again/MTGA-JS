const { BaseModel } = require("./BaseModel");
//const { splitStack } = require("../utilities");

class Quest extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    /**
     * b
     * @returns 
     */
    static async getCharacter(playerAccount) {
        const profile = await playerAccount.getProfile();
        return profile.getPmc();
    }

    static async getQuestsForPlayer(playerAccount) {

        let quests = [];

        const _profile = await this.getCharacter(playerAccount);
        const _questList = await Quest.getAllWithoutKeys();

        let count = 0;

        for (const q in _questList) {

            let quest = _questList[q];

            if (_profile.Quests.some(q => q.qid == quest._id)) {
                quests.push(quest);
            }

            const level = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Level");
            if (level.length) {
                if (await this.evaluateLevel(_profile, level[0])) {
                    continue;
                }
            }

            const questRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "Quest");
            const loyaltyRequirements = await this.filterQuestConditions(quest.conditions.AvailableForStart, "TraderLoyalty");

            if (questRequirements.length === 0 && loyaltyRequirements.length === 0) {
                quests.push(quest);
                continue;
            }

            let completedPreviousQuest = true;
            for (const condition of questRequirements) {
                const previousQuest = _profile.Quests.find(pq => pq.qid == condition._props.target);

                if (!previousQuest) {
                    completedPreviousQuest = false;
                    break;
                }

                if (previousQuest.status === Object.keys(this.questStatus)[condition._props.status[0]]) {
                    continue;
                }

                completedPreviousQuest = false;
                break;
            }

            let loyaltyCheck = true;
            for (const condition of loyaltyRequirements) {

                const result = () => {
                    const requiredLoyalty = condition._props.value;
                    const operator = condition._props.compareMethod;
                    const currentLoyalty = _profile.TraderInfo[condition._props.target].loyaltyLevel;

                    switch (operator) {
                        case ">=":
                            return currentLoyalty >= requiredLoyalty;
                        case "<=":
                            return currentLoyalty <= requiredLoyalty;
                        case "==":
                            return currentLoyalty === requiredLoyalty;
                        case "!=":
                            return currentLoyalty !== requiredLoyalty;
                        case ">":
                            return currentLoyalty > requiredLoyalty;
                        case "<":
                            return currentLoyalty < requiredLoyalty;
                    }
                }
                if (!result) {
                    loyaltyCheck = false;
                    break;
                }

                const cleanQuestConditions  = async (_quest) => {
                    _quest = await _quest.dissolve()
                    _quest.conditions.AvailableForStart = _quest.conditions.AvailableForStart.filter(q => q._parent == "Level");

                    return _quest;
                }

                if (completedPreviousQuest && loyaltyCheck) {
                    quests.push(await cleanQuestConditions(quest));
                }
            }
            count++;
        }
        return quests;
    }

    static questStatus = () => {
        return {
            "Locked": 0,
            "AvailableForStart": 1,
            "Started": 2,
            "AvailableForFinish": 3,
            "Success": 4,
            "Fail": 5,
            "FailRestartable": 6,
            "MarkedAsFailed": 7
        };
    }

    static async filterQuestConditions(quest, type) {
        return quest.filter(c => {
            return c._parent === type;
        });
    }

    static async evaluateLevel(character, condition) {
        const level = character.Info.Level;
        if (condition._parent === "Level") {
            switch (condition._props.compareMethod) {
                case ">=":
                    return level >= condition._props.value;
                default:
                    Logger.debug(`Unrecognised Comparison Method: ${condition._props.compareMethod}`);
                    return false;
            }
        }
    }

    async processReward(reward) {
        const rewardItems = [];
        let targets;
        const mods = [];

        //// separate base item and mods, fix stacks
        //for (let item of reward.items) {
        //    if (item._id === reward.target) {
        //        targets = splitStack(item);
        //    } else {
        //        mods.push(item);
        //    }
        //}

        // add mods to the base items, fix ids
        //for (const target of targets) {
        //    let questItems = [target];
//
        //    for (let mod of mods) {
        //        questItems.push(utility.DeepCopy(mod));
        //    }
//
        //    rewardItems = rewardItems.concat(helper_f.replaceIDs(null, questItems));
        //}

        return rewardItems;
    }

    async getRewards(playerProfile, state) {
        const rewards = [];

        for (const reward of this.rewards[state]) {
            switch(reward.type) {
                case "Item":
                    rewards = rewards.concat("BALLS");
                    break;
                default:
                    console.log("No reward ?");
                    break
            }
        }
        /**for (const reward of this.rewards[state]) {
            switch (reward.type) {
                case "Item":
                    rewards = rewards.concat(processReward(reward));
                    break;
                case "Experience":
                    pmcData.Info.Experience += parseInt(reward.value);
                    break;
                case "TraderStanding":
                    if (typeof pmcData.TradersInfo[reward.target] == "undefined") {
                        pmcData.TradersInfo[reward.target] = {
                        salesSum: 0,
                        standing: 0,
                        unlocked: true
                        };
                    }
                    pmcData.TradersInfo[reward.target].standing += parseFloat(reward.value);
                    break;
                case "TraderUnlock":
                    if (utility.isUndefined(pmcData.TradersInfo[reward.target])) {
                        pmcData.TradersInfo[reward.target] = {
                        salesSum: 0,
                        standing: 0,
                        unlocked: true
                        };
                    }

                    pmcData.TradersInfo[reward.target].unlocked = true;
                    break;
                case "Skill":
                    const skills = pmcData.Skills.Common.filter((skill) => skill.Id === reward.target);
                    for (const Id in skills) {
                        pmcData.Skills.Common[Id].Progress += parseInt(reward.value);
                    }
                    break;
                default:
                    console.log("MY BROTHER IN CHRIST WHAT THE FUCK ARE YOU TRYING TO ADD AS REWARD YOU FUCKING APE");
                    return "balls";
            }
        }*/
        return rewards;
    }
}

module.exports = Quest;
const { BaseModel } = require("./BaseModel");

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
        return await profile.getPmc();
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

                if (previousQuest.status === Object.keys(questStatus)[condition._props.status[0]]) {
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
}

module.exports.Quest = Quest;
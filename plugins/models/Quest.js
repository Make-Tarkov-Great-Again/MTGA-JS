const { BaseModel } = require("./BaseModel");

class Quest extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async getCharacter() {
        const { Profile } = require("./");
        const profile = await Profile.get(this.id)
        return profile.getPmc();
    }

    static async getQuestsForPlayer() {

        let quests = [];

        const _profile = await this.getCharacter();
        let quest_database = utility.DeepCopy(global._database.quests);
        const side = _profile.Info.Side;

        let count = 0;

        for (const q in quest_database) {

            let quest = quest_database[q];

            if (_profile.Quests.some(q => q.qid == quest._id)) {
                quests.push(quest);
            }

            const level = filterConditions(quest.conditions.AvailableForStart, "Level");
            if (level.length) {
                if (evaluateLevel(_profile, level[0])) {
                    continue;
                }
            }

            const questRequirements = filterConditions(quest.conditions.AvailableForStart, "Quest");
            const loyaltyRequirements = filterConditions(quest.conditions.AvailableForStart, "TraderLoyalty");

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

                const cleanQuestConditions = (quest) => {
                    quest = utility.DeepCopy(quest);
                    quest.conditions.AvailableForStart = quest.conditions.AvailableForStart.filter(q => q._parent == "Level");

                    return quest;
                }

                if (completedPreviousQuest && loyaltyCheck) {
                    quests.push(cleanQuestConditions(quest));
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
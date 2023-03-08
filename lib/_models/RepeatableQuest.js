const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Account } = require("./Account");
const { Locale } = require("./Locale");
const { Dialogue } = require("./Dialogue");
const { Quest } = require("./Quest");

/* const { database: { core: { gameplay: {
    quests: { repeatable }
} } } } = require('../../app.mjs'); */

const { logger, getCurrentTimestamp, round, generateMongoID, cloneDeep } = require("../utilities/index.mjs").default;

class RepeatableQuest extends BaseModel {
    constructor() {
        super();
    }

    static test = {
        Elimination: [
            "54cb50c76803fa8b248b4571",
            "54cb57776803fa99248b456e",
            "58330581ace78e27b8b10cee",
            "5935c25fb3acc3127c3d8cd9",
            "5ac3b934156ae10c4430e83c",
            "5c0647fdd443bc2504c2d371"
        ],
        Exploration: [
            "54cb50c76803fa8b248b4571",
            "54cb57776803fa99248b456e",
            "58330581ace78e27b8b10cee",
            "5935c25fb3acc3127c3d8cd9",
            "5ac3b934156ae10c4430e83c",
            "5c0647fdd443bc2504c2d371",
            "5a7c2eca46aef81a7ca2145d"
        ],
        Completion: [
            "54cb50c76803fa8b248b4571",
            "54cb57776803fa99248b456e",
            "58330581ace78e27b8b10cee",
            "5935c25fb3acc3127c3d8cd9",
            "5ac3b934156ae10c4430e83c",
            "5c0647fdd443bc2504c2d371",
            "5a7c2eca46aef81a7ca2145d"
        ]
    }


    async generateTemplate(questType, traderId) {

    }

}
module.exports.RepeatableQuest = RepeatableQuest;
const { logger, getCurrentTimestamp } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { Customization } = require("./Index");

class Character extends BaseModel {
    constructor() {
        super();
    }

    async solve() {
        logger.logDebug("Solving Character with ID:" + this._id);
        if(this.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(this.Customization)) {
                if(typeof id === "string") {
                    this.Customization[bodyPart] = await Customization.get(id);
                }
            }
        }
    }

    async dissolve() {
        logger.logDebug("Dissolving Character with ID:" + this._id);
        const dissolvedClone = await this.clone();
        if(dissolvedClone.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(dissolvedClone.Customization)) {
                if(typeof id === "object") {
                    dissolvedClone.Customization[bodyPart] = dissolvedClone.Customization[bodyPart]._id;
                }
            }
        }
        return dissolvedClone;
    }

    async addQuest(quest) {
        this.Quests.push({
            qid: quest._id,
            startTime: getCurrentTimestamp(),
            status: "Started"
        });
    }
}

module.exports.Character = Character;

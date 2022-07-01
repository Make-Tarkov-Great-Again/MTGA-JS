const { logger } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { Customization } = require("./Customization");

class Character extends BaseModel {
    constructor() {
        super();
    }

    async solve() {
        logger.logDebug("Solving Character");
        if(this.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(this.Customization)) {
                if(typeof id === "string") {
                    this.Customization[bodyPart] = await Customization.get(id);
                }      
            }
        }   
        
    }

    async dissolve() {
        let dissolve = await this.clone()
        if(this.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(this.Customization)) {
                if(typeof id === "string") {
                    this.Customization[bodyPart] = this.Customization[bodyPart]._id;
                }      
            }
        }   
        return dissolve;
    }
}

module.exports.Character = Character;
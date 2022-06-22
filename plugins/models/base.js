const { logger } = require("../utilities");


class baseModel {
    constructor() {

    }

    async save() {
        const { database } = require("../../app");
        var className = this.constructor.name;
        database[className + 's'][this.id] = this;

        if(database.saveModel(className, this.id)) {
            return true
        }
        
        return false;
    }
    
    async destroy() {
        const { database } = require("../../app");

        var className = this.name;
        if(delete database[className + 's'][this.id]) {
            return true;
        }

        return false;
    }

    static async get(id) {
        const { database } = require("../../app");

        var className = this.name;
        let instance = database[className + 's'][id];
        if(instance) {
            return instance;
        }

        return  false;
    }

    static async getBy(property, value) {
        const { database } = require("../../app");

        var className = this.name;
        for(let classDimensionElement of Object.keys(database[className + 's'])) {
            if(database[className + 's'][classDimensionElement][property] === value) {
                return database[className + 's'][classDimensionElement];
            }
        }
        return false;
    }
}

module.exports.baseModel = baseModel;
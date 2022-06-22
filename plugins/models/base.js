const { logger } = require("../utilities");


class baseModel {
    constructor() {

    }

    async save() {
        const { database } = require("../../app");
        var className = this.constructor.name;
        database[className + 's'][this.id] = this;
        database.save(className, this.id);
    }
    
    async destroy() {
        const { database } = require("../../app");

        var className = this.name;
        delete database[className + 's'][this.id];
    }

    static async get(id) {
        const { database } = require("../../app");

        var className = this.name;
        return database[className + 's'][id];
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
const { logger } = require("../utilities");


class baseModel {
    constructor() {

    }

    /**
     * Save the model
     * @returns true if the model was saved, will return false otherwise.
     */
    async save() {
        const { database } = require("../../app");
        var className = this.constructor.name;
        database[className + 's'][this.id] = this;

        if(database.saveModel(className, this.id)) {
            return true
        }
        
        return false;
    }
    
    /**
     * Destroy the model
     * @returns true if the model was destroyed, will return false otherwise.
     */
    async destroy() {
        const { database } = require("../../app");

        var className = this.name;
        if(delete database[className + 's'][this.id]) {
            return true;
        }

        return false;
    }

    /**
     * Get the model based on its ID
     * @returns returns the model instance, will return false otherwise.
     */
    static async get(id) {
        const { database } = require("../../app");

        var className = this.name;
        let instance = database[className + 's'][id];
        if(instance) {
            return instance;
        }

        return  false;
    }

    /**
     * Will try to get the model instance by comparing a property with the provided value.
     * @param {*} property 
     * @param {*} value 
     * @returns 
     */
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
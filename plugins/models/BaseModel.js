const { logger } = require("../utilities");


class BaseModel {
    constructor() {

    }

    /**
     * Save the model
     * @returns true if the model was saved, will return false otherwise.
     */
    async save() {
        const { database } = require("../../app");
        var className = this.constructor.name;
        database[className.toLowerCase() + 's'][this.id] = this;

        return database.saveModel(className, this.id);
    }
    
    /**
     * Destroy the model
     * @returns true if the model was destroyed, will return false otherwise.
     */
    async destroy() {
        const { database } = require("../../app");

        var className = this.name;
        return delete database[className.toLowerCase() + 's'][this.id];
    }

    /**
     * Get the model based on its ID
     * @returns returns the model instance, will return false otherwise.
     */
    static async get(id) {
        const { database } = require("../../app");

        var className = this.name;
        let instance = database[className.toLowerCase() + 's'][id];
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
        for(let classDimensionElement of Object.keys(database[className.toLowerCase() + 's'])) {
            if(database[className.toLowerCase() + 's'][classDimensionElement][property] === value) {
                return database[className.toLowerCase() + 's'][classDimensionElement];
            }
        }
        return false;
    }

    /**
     * Will get every instance of the model as a collection
     * @returns
     */
    static async getAll() {
        const { database } = require("../../app");
        var className = this.name;
        let collection = database[className.toLowerCase() + 's'];
        if(collection) {
            return collection;
        }
    }

    static async getAllWithoutKeys() {
        const withKeys = await this.getAll()
        let withoutKeys = [];
        for (let identifier of Object.keys(withKeys)) {
            withoutKeys.push(withKeys[identifier]);
        }
        return withoutKeys;
    }
}

module.exports.BaseModel = BaseModel;
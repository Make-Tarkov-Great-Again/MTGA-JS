//const { cloneDeep } = require(`../utilities/index.mjs`)


class BaseModel {
    constructor() { }

    /**
     * Creates a new database Entry of the model it's used at with the provided 
     * id parameters as it's table index
     * @param {*} id
     */
    createDatabase(id) {
        if (id) {
            const className = this.constructor.name;
            if (database[className.toLowerCase() + 's'] === undefined) database[className.toLowerCase() + 's'] = {}
            database[className.toLowerCase() + 's'][id] = this;
        }
    }

    /**
     * Save the model
     * @returns true if the model was saved, will return false otherwise.
     */
    async save() { }

    /**
     * Destroy the model
     * @returns true if the model was destroyed, will return false otherwise.
     */
    async destroy() {
        return database.splice([this.name.toLowerCase() + 's'][this.id], 1);
    }

    /**
     * Creates a deep clone of a Model, so it can, for example, 
     * be applied as a template without modifing the originating instance.
     * @returns 
     */
    async clone() {
        return cloneDeep(this);
    }

    /**
     * When creating a deep clone, you also clone the instances 
     * within the specific model. They won't point to their original instance again 
     * (their are basically a new model instance). With this function, 
     * the original instance pointers will get resolved again.
     * @returns 
     */
    async solvedClone() {
        const dissolvedClone = await this.dissolve();
        await dissolvedClone.solve();
        return dissolvedClone;
    }

    /**
     * This is a base for the solve function in which you specifiy 
     * what model references should be created.ö
     */
    async solve() {
        // Do Solve
    }

    /**
     * This is the base function to dissolve model references. 
     * With this you are supposed to, instead of having a sub instance 
     * reference inside your primary instance, return only IDs. 
     * Look at accounts for an easy to understand example.
     * @returns 
     */
    async dissolve() {
        return this.clone();
    }

    /**
     * Get the model based on its ID
     * @returns returns the model instance, will return false otherwise.
     */
    static async get(id) {
        const className = this.name;
        if (!database[className.toLowerCase() + 's'])
            return false;
        else if (!database[className.toLowerCase() + 's'][id])
            return false;
        else
            return database[className.toLowerCase() + 's'][id];
    }

    /**
     * Will try to get the model instance by comparing a property with the provided value.
     * @param {*} property
     * @param {*} value
     * @returns
     */
    static async getBy(property, value) {
        const className = this.name;

        if (!database[className.toLowerCase() + 's']) {
            return false;
        }

        for (const classDimensionElement of Object.keys(database[className.toLowerCase() + 's'])) {
            if (database[className.toLowerCase() + 's'][classDimensionElement][property] === value) {
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
        const className = this.name;
        if (!database[className.toLowerCase() + 's']) {
            return false;
        } else return database[className.toLowerCase() + 's']
    }

    static async getAllValues() {
        return Object.values(await this.getAll());
    }

    static async getAllKeys() {
        return Object.keys(await this.getAll());
    }
}

module.exports.BaseModel = BaseModel;
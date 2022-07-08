class UtilityModel {
    /////////////////// MODEL DATA ///////////////////

    static async createModelFromParse(model, data) {
        let classModel = eval(`new ${model}`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createModelFromParseWithID(model, id, data) {
        let classModel = eval(`new ${model}("${id}")`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createCollectionFromParse(model, dataSet) {
        let collection = {};
        for (const [index, data] of Object.entries(dataSet)) {
            collection[index] = await this.createModelFromParse(model, data);
        }

        return collection;
    }
}
module.exports.UtilityModel = UtilityModel;
const { Account } = require('./Account');
const { Bot } = require('./Bot');
const { Character } = require('./Character');
const { Customization } = require('./Customization');
const { Dialogue } = require('./Dialogue');
const { Edition } = require('./Edition');
const { HideoutArea } = require('./HideoutArea');
const { HideoutProduction } = require('./HideoutProduction');
const { HideoutScavcase } = require('./HideoutScavcase');
const { Item } = require('./Item');
const { Language } = require('./Language');
const { Locale } = require('./Locale');
const { Location } = require('./Location');
const { ItemNode } = require('./ItemNode');
const { Notification } = require('./Notification');
const { Preset } = require('./Preset');
const { Profile } = require('./Profile');
const { Quest } = require('./Quest');
const { Ragfair } = require('./Ragfair');
const { RagfairOffer } = require('./RagfairOffer');
const { Trader } = require('./Trader');
const { Weapon } = require('./Weapon');



class UtilityModel {

    static async createModelFromParse(model, data) {
        const classModel = eval(`new ${model}`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createModelFromParseWithID(model, id, data) {
        const classModel = eval(`new ${model}("${id}")`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createCollectionFromParse(model, dataSet) {
        const collection = {};
        for (const [index, data] of Object.entries(dataSet)) {
            collection[index] = await this.createModelFromParse(model, data);
        }

        return collection;
    }

    static async deleteModelWithId(model, id) {
        delete database[model.toLowerCase() + 's'][id];
    }
}
module.exports.UtilityModel = UtilityModel;

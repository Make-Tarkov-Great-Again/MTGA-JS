const BaseModel  = require('./BaseModel');
const Character = require('./Character');
const Account = require('./Account');
const Trader = require('./Trader');
const Item = require('./Item');
const Locale = require('./Locale');
const Language = require('./Language');
const Edition = require('./Edition');
const Customization = require('./Customization');
const Profile = require('./Profile');
const Dialogue = require('./Dialogue');
const Quest = require('./Quest');
const Weaponbuild = require('./Weaponbuild');
const HideoutArea = require('./HideoutArea');
const HideoutProduction = require('./HideoutProduction');
const HideoutScavcase = require('./HideoutScavcase');
const Location = require('./Location');
const Bot  = require('./Bot');

class UtilityModel {

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
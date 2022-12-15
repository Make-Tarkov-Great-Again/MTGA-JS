const { BaseModel } = require("./BaseModel");

class Locale extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async getQuestLocales(questId) {
        return this.locale[questId];
    }

    /**
     * Directly access item locales of specified language
     * @param {string} language ch, cz, en, es, es-mx, fr, ge, hu, it, jp, kr, pl, po, ru, sk, tu
     * @param {string} itemId use tpl or _id
     * @returns 
     */
    static async getItemLocales(language, itemTpl) {
        const { locale } = await Locale.get(language);

        return {
            Name: locale[`${itemTpl} Name`],
            ShortName: locale[`${itemTpl} ShortName`],
            Description: locale[`${itemTpl} Description`],
        }
    }
}

module.exports.Locale = Locale;
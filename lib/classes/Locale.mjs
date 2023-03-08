import { database } from "../../app.mjs";

export class Locale {

    static get(language) {
        const output = database.locales[language];
        return output;
    }

    static async getQuestLocales(language, questId) {
        const { locale } = database.locales[language];
        return {
            name: locale[`${questId} name`],
            description: locale[`${questId} description`],
            failMessageText: locale[`${questId} failMessageText`],
            successMessageText: locale[`${questId} successMessageText`]
        };
    }
}
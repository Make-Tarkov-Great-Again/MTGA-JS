import { database } from "../../app.mjs";

export class Language {

    static get(language){
        const output = database.language[language];
        return output;
    }

    static getAll() {
        return database.languages;
    }
}
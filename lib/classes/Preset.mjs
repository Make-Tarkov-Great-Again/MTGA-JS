import { database } from "../../app.mjs";


export class Preset {

    static getPresetsByItemId(itemId) {
        return database.presets[itemId] ? database.presets[itemId] : false;
    }
}

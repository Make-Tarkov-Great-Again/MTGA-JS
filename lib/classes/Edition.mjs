import { database } from "../../app.mjs";
import { getCurrentTimestamp, logger, Response, generateMongoID, round, cloneDeep } from "../utilities/_index.mjs";


export class Edition {

    /**
     * Get the edition using it's name
     */
    static getEdition(editionName) {
        return database.editions[editionName];
    }

    static async getCopyCharacterTemplateWithSide(playerEdition, side) {
        const edition = Edition.getEdition(playerEdition);
        return cloneDeep(edition[side]);
    }

    static async getCopyStorageSuitsWithSide(playerEdition, side) {
        const edition = Edition.getEdition(playerEdition);
        return cloneDeep(edition.storage[side]);
    }

    static getAll() {
        return database.editions;
    }

    static getAllValues() {
        return Object.values(database.editions);
    }

    static getAllKeys() {
        return Object.keys(database.editions);
    }

}

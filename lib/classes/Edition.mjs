import { database } from "../../app.mjs";


export class Edition {

    /**
     * Get the edition using it's name
     */
    static getEdition(editionName) {
        return database.editions[editionName];
    }

    static getCopyCharacterTemplateWithSide(playerEdition, side) {
        const edition = Edition.getEdition(playerEdition);
        return structuredClone(edition[side]);
    }

    static getCopyStorageSuitsWithSide(playerEdition, side) {
        const edition = Edition.getEdition(playerEdition);
        return structuredClone(edition.storage[side]);
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

import { database } from "../../app.mjs";


export class Edition {

    /**
     * Get the edition using it's name
     */
    static getEdition(editionName) {
        return database.editions[editionName];
    }

    static getCopyCharacterTemplateWithSide(playerEdition, side) {
        return { ...this.getEdition(playerEdition)[side] };
    }

    static getCopyStorageSuitsWithSide(playerEdition, side) {
        return [...this.getEdition(playerEdition).storage[side]];
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

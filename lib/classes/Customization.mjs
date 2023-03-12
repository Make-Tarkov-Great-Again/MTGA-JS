import { database } from "../../app.mjs";

export class Customization {

    static getWithId(customizationID){
        if(!database.customization[customizationID]) {
            logger.error(`${customizationID} is an invalid Customization ID`);
            return false;
        }
        return database.customization[customizationID];
    }

    static getAll() {
        return database.customization;
    }

}

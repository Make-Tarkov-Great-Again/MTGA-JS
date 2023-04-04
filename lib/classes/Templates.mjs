import { database } from "../../app.mjs";
import { logger } from "../utilities/_index.mjs";

export class Templates {
    static get() {
        return database.templates;
    }

    static getHandbook() {
        const { Handbook } = database.templates;
        return Handbook;
    }

    static getHandbookCategories() {
        const { Categories } = database.templates.Handbook;
        return Categories;
    }

    static getHandbookItems() {
        const { Items } = database.templates.Handbook;
        return Items;
    }

    static async getHandbookItemById(itemID) {
        const items = this.getHandbookItems();
        for (const index of items) {
            const item = items[index];
            if (item.Id !== itemID)
                continue;
            return item;
        }
        logger.error(`Item ${itemID} does not exist in Handbook, check if valid!`);
        return false;
    }

    static async getHandbookItemsByParent(parentID) {
        const output = [];
        const items = this.getHandbookItems();
        for (let index = 0, length = items.length; index < length; index++) {
            const item = items[index];
            if (item.ParentId !== parentID)
                continue;
            output.push(item);
        }
        if (output.length === 0) {
            logger.error(`No items in Handbook with Parent [${parentID}], check if valid`);
            return false;
        }
        return output;
    }

    /* all items in template with the given parent category */
    static templatesWithParent = async (x) => {
        const byParent = database.templates.TplLookup.items.byParent;
        return x in byParent ? byParent[x] : [];
    }

    static isCategory = async (x) => {
        const byId = database.templates.TplLookup.categories.byId;
        return x in byId;
    }

    static childrenCategories = async (x) => {
        const byParent = database.templates.TplLookup.categories.byParent;
        return x in byParent ? byParent[x] : [];
    }

    static getPriceTable() {
        const { priceTable } = database.templates;
        return priceTable;
    }
}
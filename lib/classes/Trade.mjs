import { logger } from "../utilities/_index.mjs";

import { Inventory } from "./Inventory.mjs";
import { Item } from "./Item.mjs";

export class Trade {

    /**
     * Check if itemId given is money, if not it checks the characterInventory for item and rechecks
     * @param {object} characterInventory character.Inventory
     * @param {object} characterChanges 
     * @param {string} beingTraded currency/barter ID to decipher type
     * @param {int} cost total cost of trade
     * @returns {<Promise>bool}
     */
    static typeOfPurchase(characterInventory, characterChanges, beingTraded, cost) {
        if (Item.checkIfTplIsMoney(beingTraded)) { //
            const bank = Inventory.getInventoryItemsByTpl(characterInventory, beingTraded);
            return this.payMoneyForTrade(characterInventory, characterChanges, bank, cost);
        }

        const item = Inventory.getInventoryItemByID(characterInventory, beingTraded);
        if (!item) {
            logger.error(`${beingTraded} does not exist in your inventory!`);
            return false;
        }

        if (Item.checkIfTplIsMoney(item._tpl)) {
            return this.payMoneyForTrade(characterInventory, characterChanges, [item], cost);
        }

        return this.payItemForTrade(characterInventory, characterChanges, [item], cost);
    }

    static payMoneyForTrade(characterInventory, characterChanges, bank, cost) {
        for (let i = bank.length - 1; i >= 0; i--) {
            if (cost === 0) break;
            const stack = bank[i].upd.StackObjectsCount;

            if (stack && stack <= cost) {
                cost = (cost - stack);
                Inventory.removeItem(characterInventory, characterChanges, bank[i]._id, -1);
            }
            else {
                Inventory.removeItem(characterInventory, characterChanges, bank[i]._id, cost);
                break;
            }
        }
        return true;
    }

    static recieveMoneyFromTrade(characterInventory, characterChanges, change) {
        return;
    }

    static payItemForTrade(characterInventory, characterChanges, bank, cost) {
        for (let i = bank.length - 1; i >= 0; i--) {
            if (cost === 0) break;
            const stack = bank[i]?.upd?.StackObjectsCount ? bank[i].upd.StackObjectsCount : false;

            if (!stack) {
                Inventory.removeItem(characterInventory, characterChanges, bank[i]._id, -1);
                break;
            }

            if (stack <= cost) {
                cost = (cost - stack);
                Inventory.removeItem(characterInventory, characterChanges, bank[i]._id, -1);
            }
            else {
                Inventory.removeItem(characterInventory, characterChanges, bank[i]._id, cost);
                break;
            }
        }
        return true;
    }

}

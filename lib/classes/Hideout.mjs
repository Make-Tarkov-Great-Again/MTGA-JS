import { database } from "../../app.mjs";
import { logger, round, getCurrentTimestamp } from "../utilities/_index.mjs";
import { Inventory } from "./Inventory.mjs";
import { Item } from "./Item.mjs";


export class Hideout {

    static getHideoutQTEList() {
        return database.hideout.qte;
    }

    static getAllHideoutAreas() {
        return database.hideout.areas;
    }

    static getAllHideoutProductions() {
        return database.hideout.productions;
    }

    static getAllScavcaseRecipes() {
        return database.hideout.scavcase;
    }

    static getHideoutSettings() {
        return database.core.hideoutSettings;
    }

    static getAreaByType(areaType) {
        const hideoutArea = Hideout.getAllHideoutAreas();
        return hideoutArea.find(
            area => area.type === areaType
        );
    }

    static getCharacterAreaByType(character, areaType) {
        return character.Hideout.Areas.find(
            area => area.type === areaType
        );
    }

    /**
     * Update player hideout area with new data:
     * - at the start of a upgrade,
     * - at the completion of a upgrade
     */
    static updatePlayerArea(playerArea, newData) {
        if (newData.level)
            playerArea.level = newData.level;
        if (newData.completeTime)
            playerArea.completeTime = newData.completeTime;
        if (typeof newData.constructing === "boolean")
            playerArea.constructing = newData.constructing;
    }

    static async upgradeArea(character, moveAction, characterChanges) {
        const areaType = moveAction.areaType;
        const dbHideoutArea = this.getAreaByType(areaType);
        if (!dbHideoutArea)
            return;

        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea)
            return;

        const nextLevel = playerHideoutArea.level + 1;
        // that will never happen
        if (!dbHideoutArea.stages[nextLevel])
            return;

        for (const itemToTake of moveAction.items) {
            const itemsChanges = Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
            if (!itemsChanges) {
                logger.error(`[Hideout.upgradeArea] Unable to take required items.`);
                return;
            }
        }
        this.updatePlayerArea(playerHideoutArea, {
            completeTime: round(getCurrentTimestamp() + dbHideoutArea.stages[nextLevel].constructionTime),
            constructing: true
        });
    }

    static completeUpgrade(character, moveAction, _characterChanges) {
        const areaType = moveAction.areaType;
        const dbHideoutArea = this.getAreaByType(areaType);
        if (!dbHideoutArea)
            return;

        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea)
            return;

        const nextLevel = playerHideoutArea.level + 1;
        // that will never happen
        if (!dbHideoutArea.stages[nextLevel])
            return;

        this.updatePlayerArea(playerHideoutArea, {
            level: nextLevel,
            completeTime: 0,
            constructing: false
        });
        // TODO: HIDEOUT BONUS
    }

    static async improveArea(character, moveAction, characterChanges) {
        const areaType = moveAction.areaType;
        const dbHideoutArea = this.getAreaByType(areaType);
        if (!dbHideoutArea)
            return;

        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea)
            return;

        const nextLevel = playerHideoutArea.level + 1;
        // that will never happen
        if (!dbHideoutArea.stages[nextLevel])
            return;

        for (const itemToTake of moveAction.items) {
            const itemsChanges = await Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
            if (!itemsChanges) {
                logger.error(`[Hideout.improveArea] Unable to take required items.`);
                return;
            }
        }

        const stageImprovements = dbHideoutArea.stages[nextLevel].improvements;
        const time = getCurrentTimestamp();
        for (const improvement of stageImprovements) {
            const improvementData = {
                completed: false,
                improveCompleteTimestamp: (time + improvement.improvementTime)
            };
            characterChanges.improvements[improvement.id] = improvementData;
            character.Hideout.Improvements[improvement.id] = improvementData;
        }
    }

    static async addItemToAreaSlot(character, moveAction, characterChanges) {
        const areaType = moveAction.areaType;
        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if(!playerHideoutArea)
            return;
        for (const itemSlot in moveAction.items) {
            const playerItem = Inventory.getInventoryItemByID(character.Inventory, moveAction.items[itemSlot].id);
            if (!playerItem) {
                logger.error(`[Hideout.addItemToAreaSlot] Unable to find required items.`);
                return;
            }
            const itemsChanges = await Inventory.removeItem(character.Inventory, characterChanges, playerItem._id, moveAction.items[itemSlot].count);
            if (!itemsChanges) {
                logger.error(`[Hideout.addItemToAreaSlot] Unable to take required items.`);
                return;
            }
            playerHideoutArea.slots[itemSlot] = {
                _id: playerItem._id,
                _tpl: playerItem._tpl,
                upd: playerItem.upd
            };
        }
    }

    static async takeItemFromAreaSlot(character, moveAction, characterChanges) {
        const areaType = moveAction.areaType;
        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea) {
            logger.error(`[Hideout.takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType}.`);
            return;
        }
        const stashContainerID = await Inventory.getStashContainer(character.Inventory);
        const stashContainer = await Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
        for (const slot of moveAction.slots) {
            const itemData = Item.get(playerHideoutArea.slots[slot]._tpl);
            const itemsAdded = await Inventory.addItemToInventory(character, stashContainer, playerHideoutArea.slots[slot]._id, itemData);
            if (!itemsAdded) {
                logger.error(`[Hideout.takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType}.`);
                return;
            }
            characterChanges.items.new = [...characterChanges.items.new, ...itemsAdded];
            playerHideoutArea.slots.splice(slot, 1);
        }
    }

}

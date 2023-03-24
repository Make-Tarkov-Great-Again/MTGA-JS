import { database } from "../../app.mjs";
import { logger, round, getCurrentTimestamp } from "../utilities/_index.mjs";
import { Inventory } from "./Inventory.mjs";


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
            const itemsChanges = await Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
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

    static improveArea(character, moveAction, characterChanges) {
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

        const stageImprovements = dbHideoutArea.stages[nextLevel].improvements;
        const time = getCurrentTimestamp();
        for (const improvement of stageImprovements) {
            characterChanges.improvements[improvement.id] = {
                completed: false,
                improveCompleteTimestamp: (time + improvement.improvementTime)
            };
        }
    }

}

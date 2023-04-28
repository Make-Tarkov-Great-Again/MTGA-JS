import { database } from "../../app.mjs";
import { logger, getCurrentTimestamp, generateMongoID } from "../utilities/_index.mjs";
import { Inventory } from "./Inventory.mjs";
import { Item } from "./Item.mjs";
import { Preset } from "./Preset.mjs";


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

    static getHideoutProductionById(productionId) {
        const hideoutProductions = this.getAllHideoutProductions();
        return hideoutProductions.find(production => production._id === productionId);
    }

    static getAllScavcaseRecipes() {
        return database.hideout.scavcase;
    }

    static getScavcaseRecipeById(scavcaseRecipeId) {
        const scavcaseRecipes = this.getAllScavcaseRecipes();
        return scavcaseRecipes.find(recipe => recipe._id === scavcaseRecipeId);
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

    static getCharacterHideoutProductionById(character, productionId) {
        return character.Hideout.Production[productionId];
    }

    /**
     * Update player hideout area with new data:._id.
     * - at the start of a upgrade,
     * - at the completion of a upgrade
     */
    static updatePlayerArea(playerArea, newData) {
        if (newData.level)
            playerArea.level = newData.level;
        if (typeof newData.completeTime === "number")
            playerArea.completeTime = newData.completeTime;
        if (typeof newData.constructing === "boolean")
            playerArea.constructing = newData.constructing;
    }

    static upgradeArea(character, moveAction, characterChanges) {
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
            completeTime: Math.round(getCurrentTimestamp() + dbHideoutArea.stages[nextLevel].constructionTime),
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

        for (const itemToTake of moveAction.items) {
            const itemsChanges = Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
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

    static addItemToAreaSlot(character, moveAction, characterChanges) {
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
            playerHideoutArea.slots[itemSlot] = {
                item: [{
                    _id: playerItem._id,
                    _tpl: playerItem._tpl,
                    upd: playerItem.upd
                }]
            };

            const itemsChanges = Inventory.removeItem(character.Inventory, characterChanges, playerItem._id, moveAction.items[itemSlot].count);
            if (!itemsChanges) {
                logger.error(`[Hideout.addItemToAreaSlot] Unable to take required items.`);
                return;
            }
        }
    }

    static takeItemFromAreaSlot(character, moveAction, characterChanges) {
        const areaType = moveAction.areaType;
        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea) {
            logger.error(`[Hideout.takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType}.`);
            return;
        }
        const stashContainerID = Inventory.getStashContainer(character.Inventory);
        const stashContainer = Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
        for (const slot of moveAction.slots) {
            const itemData = Item.get(playerHideoutArea.slots[slot]._tpl);
            const itemsAdded = Inventory.addItemToInventory(character, stashContainer, itemData);
            if (!itemsAdded) {
                logger.error(`[Hideout.takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType}.`);
                return;
            }
            characterChanges.items.new = [...characterChanges.items.new, ...itemsAdded];
            playerHideoutArea.slots.splice(slot, 1);
        }
    }

    static singleProductionStart(character, moveAction, characterChanges) {
        const production = this.getHideoutProductionById(moveAction.recipeId);
        if (!production) {
            logger.error(`[Hideout.singleProductionStart] Unknown hideout production with Id ${moveAction.recipeId}.`);
            return;
        }
        for (const itemToTake of moveAction.items) {
            const itemsRemoved = Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
            if (!itemsRemoved) {
                logger.error(`[Hideout.singleProductionStart] Unable to take required items ${itemToTake.id} for recipe ${moveAction.recipeId}.`);
                return;
            }
        }
        const productionTime = production.ProductionTime ? production.ProductionTime : production.productionTime;
        const productionCount = production.count ? production.count : 1;
        const products = [{
            _id: generateMongoID(),
            _tpl: production.endProduct,
            count: productionCount
        }];
        character.Hideout.Production[moveAction.recipeId] = {
            Progress: 0,
            inProgress: true,
            Products: products,
            RecipeId: moveAction.recipeId,
            SkipTime: 0,
            ProductionTime: Number(productionTime),
            StartTimestamp: getCurrentTimestamp()
        };
    }

    static continuousProductionStart(character, moveAction, _characterChanges) {
        const production = this.getHideoutProductionById(moveAction.recipeId);
        if (!production) {
            logger.error(`[Hideout.continuousProductionStart] Unknown hideout production with Id ${moveAction.recipeId}.`);
            return;
        }
        const productionTime = production.ProductionTime ? production.ProductionTime : production.productionTime;
        character.Hideout.Production[production._id] = {
            Progress: 0,
            inProgress: true,
            continuous: true,
            Products: [],
            RecipeId: moveAction.recipeId,
            SkipTime: 0,
            ProductionTime: Number(productionTime),
            StartTimestamp: getCurrentTimestamp()
        };
    }

    static toggleArea(character, moveAction, _characterChanges) {
        const areaType = moveAction.areaType;
        const playerHideoutArea = this.getCharacterAreaByType(character, areaType);
        if (!playerHideoutArea) {
            logger.error(`[Hideout.toggleArea] Unable to find hideout area type ${moveAction.areaType}.`);
            return;
        }
        playerHideoutArea.active = moveAction.enabled;
    }

    static takeProduction(character, moveAction, characterChanges) {
        const production = this.getCharacterHideoutProductionById(character, moveAction.recipeId);
        const stashContainerID = Inventory.getStashContainer(character.Inventory);
        const stashContainer = Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
        for (const product of production.Products) {
            const item = Item.get(product._tpl);
            const itemPresets = Preset.getPresetsByItemId(item._id);
            if (itemPresets) {
                const itemPreset = Object.values(itemPresets).find(preset => preset._encyclopedia);
                const itemChilds = Item.prepareChildrenForAddItem(itemPreset._items[0]._id, itemPreset._items);
                const itemsAdded = Inventory.addItemToInventory(character, stashContainer, item, product.count, itemChilds);
                if (!itemsAdded) {
                    logger.error(`[Hideout.takeProduction] Unable to find hideout area type ${moveAction.areaType}.`);
                    return;
                }
                characterChanges.items.new = [...characterChanges.items.new, ...itemsAdded];
            } else {
                const itemsAdded = Inventory.addItemToInventory(character, stashContainer, item, product.count);
                if (!itemsAdded) {
                    logger.error(`[Hideout.takeProduction] Unable to find hideout area type ${moveAction.areaType}.`);
                    return;
                }
                characterChanges.items.new = [...characterChanges.items.new, ...itemsAdded];
            }
        }
        if (production.continuous) {
            production.Products = [];
            return;
        }
        delete character.Hideout.Production[moveAction.recipeId];
    }

    static scavcaseProductionStart(character, moveAction, characterChanges) {
        const production = this.getScavcaseRecipeById(moveAction.recipeId);
        if (!production) {
            logger.error(`[Hideout.scavcaseProductionStart] Unknown hideout scavcase recipe with Id ${moveAction.recipeId}`);
            return;
        }

        for (const itemToTake of moveAction.items) {
            const itemsRemoved = Inventory.removeItem(character.Inventory, characterChanges, itemToTake.id, itemToTake.count);
            if (!itemsRemoved) {
                logger.error(`[Hideout.scavcaseProductionStart] Unable to take required items ${itemToTake.id} for recipe ${moveAction.recipeId}.`);
                return;
            }
        }
        const scavcaseProduct = HideoutUtils.generateScavcaseRewards();
        character.Hideout.Production[production._id] = {
            Progress: 0,
            inProgress: true,
            RecipeId: moveAction.recipeId,
            Products: scavcaseProduct,
            SkipTime: 0,
            ProductionTime: Number(production.ProductionTime),
            StartTimestamp: getCurrentTimestamp()
        };
    }

    static recordShootingRangeScore(character, moveAction, _characterChanges) {
        const characterCounters = character.Stats.OverallCounters.Items;
        const shootingRangeStats = characterCounters.find(x => x.Key === "ShootingRangePoints");
        if (!shootingRangeStats) {
            characterCounters.push({
                Key: "ShootingRangePoints",
                Value: moveAction.points
            });
            return;
        }
        shootingRangeStats.Value = moveAction.points;
    }
}

class HideoutUtils {
    static generateScavcaseRewards() {
        return [{
            _id: generateMongoID(),
            _tpl: '5696686a4bdc2da3298b456a'
        }];
    }
}

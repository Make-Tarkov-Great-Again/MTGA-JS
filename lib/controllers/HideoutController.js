const { getCurrentTimestamp, logger, generateMongoID, Response } = require("../utilities");
const { HideoutArea } = require('../models/HideoutArea');
const { HideoutProduction } = require('../models/HideoutProduction');
const { HideoutScavcase } = require('../models/HideoutScavcase');
const { Preset } = require('../models/Preset');
const { Item } = require('../models/Item');



class HideoutController {

    static async hideoutActions(moveAction, playerProfile) {
        switch (moveAction.Action) {
            case "HideoutUpgrade":
                return this.startUpgradeArea(moveAction, playerProfile);
            case "HideoutUpgradeComplete":
                return this.completeUpgradeArea(moveAction, playerProfile);
            case "HideoutPutItemsInAreaSlots":
                return this.addItemToAreaSlot(moveAction, playerProfile);
            case "HideoutTakeItemsFromAreaSlots":
                return this.takeItemFromAreaSlot(moveAction, playerProfile);
            case "HideoutToggleArea":
                return this.toggleArea(moveAction, playerProfile);
            case "HideoutSingleProductionStart":
                return this.singleProductionStart(moveAction, playerProfile);
            case "HideoutContinuousProductionStart":
                return this.continuousProductionStart(moveAction, playerProfile);
            case "HideoutScavCaseProductionStart":
                return this.scavcaseProductionStart(moveAction, playerProfile);
            case "HideoutTakeProduction":
                return this.takeProduction(moveAction, playerProfile);
            case "RecordShootingRangePoints":
                return this.recordShootingRangeScore(moveAction, playerProfile);
            case "HideoutImproveArea":
                return this.improveArea(moveAction, playerProfile);
            default:
                await logger.error(`[HideoutController.hideoutActions] No handler for action ${moveAction}`);
                return false;
        }
    }

    static async improveArea(moveAction, playerProfile) {
        const output = {
            improvements: {}
        };
        const character = playerProfile.character;

        const items = [];
        for (const item of moveAction) {
            const itemInInventory = await character.getInventoryItemByID(item.id);
            items.push({
                inventoryItem: itemInInventory,
                requestedItem: item
            });
        }

        for (const item of items) {
            // change stack or remove item
        }

        const area = await HideoutArea.getAreaByType(moveAction.areaType);
        const improvements = area.stages[hideout.level].improvements;
        if (improvements.length === 0)
            return output;

        const hideout = await character.getHideoutAreaByType(moveAction.areaType);
        const time = await getCurrentTimestamp();
        for (const improvement of improvements) {
            output.improvements[improvement.id] = {
                completed: false,
                improveCompleteTimestamp: (time + improvement.improvementTime)
            };
        }

        return output;
    }

    static async recordShootingRangeScore(moveAction, playerProfile) {
        const path = playerProfile.character.Stats.OverallCounters.Items;

        const stats = path.find(x => x.Key === "ShootingRangePoints");
        if (stats) {
            stats.Value = moveAction.points;
        }
        else {
            path.push({
                Key: "ShootingRangePoints",
                Value: 0
            });
        }
    }

    static async clientHideoutWorkout(request, reply) {
        await logger.info(`nah son nah`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("empty")
        );
    }

    static async clientHideoutQTEList(reply) {
        const { database: { hideout: { qte } } } = require('../../app');
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: qte }
        );
    }

    static async clientHideoutSettings(reply) {
        const { database: { core: { hideoutSettings } } } = require('../../app');
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutSettings }
        );
    }

    static async clientHideoutAreas(reply) {
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: await HideoutArea.getAllWithoutKeys() }
        );
    }

    static async clientHideoutProductionRecipes(reply) {
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: await HideoutProduction.getAllWithoutKeys() }
        );
    }

    static async clientHideoutProductionScavcaseRecipes(reply) {
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: await HideoutScavcase.getAllWithoutKeys() }
        );
    }

    static async startUpgradeArea(moveAction = null, playerProfile = null) {
        await logger.debug(`[HideoutController.startUpgradeArea]` + moveAction);
        const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
        const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

        if (!templateHideoutArea) {
            await logger.error(`[HideoutController.startUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
            return false;
        }

        if (!characterHideoutArea) {
            await logger.error(`[HideoutController.startUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
            return false;
        }

        const nextLevel = characterHideoutArea.level + 1;
        if (!templateHideoutArea.stages[nextLevel]) {
            await logger.error(`[HideoutController.startUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id} failed. The level ${nextLevel} doesn't exist.`);
            return false;
        }

        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };

        for (const itemToTake of moveAction.items) {
            const itemTaken = await playerProfile.character.removeItem(itemToTake.id, itemToTake.count);
            if (!itemTaken) {
                await logger.error(`[HideoutController.startUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id} failed. Unable to take required items.`);
                return false;
            }
            if (itemTaken.changed.length > 0)
                output.items.change = output.items.change.concat(itemTaken.changed);
            if (itemTaken.removed.length > 0)
                output.items.del = output.items.del.concat(itemTaken.removed);
        }

        const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
        const currentTime = await getCurrentTimestamp();
        characterHideoutArea.completeTime = ~~(currentTime + templateHideoutAreaStage.constructionTime);
        characterHideoutArea.constructing = true;

        return output;
    }

    static async completeUpgradeArea(moveAction = null, playerProfile = null) {
        const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
        const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

        if (!templateHideoutArea) {
            await logger.error(`[completeUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
            return false;
        }

        if (!characterHideoutArea) {
            await logger.error(`[completeUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
            return false;
        }
        const nextLevel = characterHideoutArea.level + 1;
        const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
        if (typeof templateHideoutAreaStage === "undefined") {
            await logger.error(`[completeUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id}. The level ${nextLevel} doesn't exist.`);
            return false;
        }

        characterHideoutArea.level = nextLevel;
        characterHideoutArea.completeTime = 0;
        characterHideoutArea.constructing = false;

        const hideoutBonuses = templateHideoutAreaStage.bonuses;

        if (typeof hideoutBonuses !== "undefined" && hideoutBonuses.length > 0) {
            for (const hideoutBonus of hideoutBonuses) {
                if (await playerProfile.character.applyHideoutBonus(hideoutBonus)) {
                    await logger.debug("applyHideoutBonus??????")
                }
            }
        }
    }

    static async addItemToAreaSlot(moveAction = null, playerProfile = null) {
        const output = { items: { new: [], change: [], del: [] } };
        const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
        if (!hideoutArea) {
            await logger.logError(`[addItemToAreaSlot] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
            return output;
        }

        for (const itemPosition in moveAction.items) {

            if (moveAction.items.hasOwnProperty(itemPosition)) {
                const itemData = moveAction.items[itemPosition];
                const item = await playerProfile.character.getInventoryItemByID(itemData.id);
                const slotData = {
                    item: [
                        {
                            _id: item._id,
                            _tpl: item._tpl,
                            upd: item.upd
                        }
                    ]
                };
                hideoutArea.slots[itemPosition] = slotData;
                await playerProfile.character.removeItem(item._id);
                output.items.del.push(item);
            }
        }
        return output;
    }

    static async takeItemFromAreaSlot(moveAction = null, playerProfile = null) {
        const output = { items: { new: [], change: [], del: [] } };
        const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
        if (!hideoutArea) {
            await logger.error(`[takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
            return output;
        }

        const container = playerProfile.character.getInventoryItemByID(await playerProfile.character.getStashContainer())
        for (const slot of moveAction.slots) {
            for (const item of hideoutArea.slots[slot].item) {
                let itemAdded = false
                if (typeof item.upd !== "undefined") {
                    itemAdded = await playerProfile.character.addItem(container, item._tpl, false, 1, undefined, item.upd);
                } else {
                    itemAdded = await playerProfile.character.addItem(container, item._tpl, false, 1);
                }

                if (itemAdded) {
                    output.items.new = [...output.items.new, ...itemAdded];
                    if (hideoutArea.slots.length > 1) {
                        hideoutArea.slots[slot] = null;
                    } else {
                        hideoutArea.slots.splice(slot, 1);
                    }
                }
            }
        }
        return output;
    }

    static async toggleArea(moveAction = null, playerProfile = null) {
        const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
        if (!hideoutArea) {
            await logger.error(`[toggleArea] Unable to find hideout area type ${moveAction.areaType}.`);
            return false;
        }

        await hideoutArea.setActive(moveAction.enabled);
    }

    static async singleProductionStart(moveAction = null, playerProfile = null) {
        await logger.debug(`[singleProductionStart]` + moveAction);
        const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
        if (!hideoutProductionTemplate) {
            await logger.error(`[singleProductionStart] Starting hideout production failed. Unknown hideout production with Id ${moveAction.recipeId}.`);
            return false;
        }

        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };

        let allItemsTaken = true;
        for (const itemToTake of moveAction.items) {
            const itemTaken = await playerProfile.character.removeItem(itemToTake.id, itemToTake.count);
            if (itemTaken) {
                if (typeof itemTaken.changed !== "undefined") {
                    output.items.change = output.items.change.concat(itemTaken.changed);
                }

                if (typeof itemTaken.removed !== "undefined") {
                    output.items.del = output.items.del.concat(itemTaken.removed);
                }
            } else {
                allItemsTaken = false;
            }
        }

        if (allItemsTaken) {
            let productionTime = 0;

            if (typeof hideoutProductionTemplate.ProductionTime !== "undefined") {
                productionTime = hideoutProductionTemplate.ProductionTime;
            } else if (typeof hideoutProductionTemplate.productionTime !== "undefined") {
                productionTime = hideoutProductionTemplate.productionTime;
            }

            if (!hideoutProductionTemplate.count) {
                hideoutProductionTemplate.count = 1;
            }

            const productId = await generateMongoID();
            const products = [{
                _id: productId,
                _tpl: hideoutProductionTemplate.endProduct,
                count: hideoutProductionTemplate.count
            }];

            playerProfile.character.Hideout.Production[hideoutProductionTemplate._id] = {
                Progress: 0,
                inProgress: true,
                Products: products,
                RecipeId: moveAction.recepieId,
                SkipTime: 0,
                ProductionTime: Number(productionTime),
                StartTimestamp: await getCurrentTimestamp()
            };

            return output;
        } else {
            // How do return custom error to client!!1!1!!!111!elf?
            await logger.error(`[singleProductionStart] Starting hideout production for recepie with Id ${moveAction.recipeId} failed. Unable to take required items.`);
            return false;
        }
    }

    static async continuousProductionStart(moveAction = null, playerProfile = null) {
        const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
        if (!hideoutProductionTemplate) {
            await logger.error(`[continuousProductionStart] Couldn't start hideout production. Unknown production with Id ${moveAction.recipeId}`);
            return;
        }

        let productionTime = 0;
        if (typeof hideoutProductionTemplate.ProductionTime !== "undefined") {
            productionTime = hideoutProductionTemplate.ProductionTime;
        } else if (typeof hideoutProductionTemplate.productionTime !== "undefined") {
            productionTime = hideoutProductionTemplate.productionTime;
        }

        playerProfile.character.Hideout.Production[hideoutProductionTemplate._id] = {
            Progress: 0,
            inProgress: true,
            continuous: true,
            Products: [],
            RecipeId: moveAction.recipeId,
            SkipTime: 0,
            ProductionTime: Number(productionTime),
            StartTimestamp: await getCurrentTimestamp()
        };
    }

    static async scavcaseProductionStart(moveAction = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        const hideoutScavcaseProduction = await HideoutScavcase.get(moveAction.recipeId);
        if (!hideoutScavcaseProduction) {
            await logger.error(`[scavcaseProductionStart] Couldn't start scavcase. Unknown hideout scavcase with Id ${moveAction.recipeId}`);
        }
        const itemTaken = await playerProfile.character.removeItem(moveAction.items[0].id, moveAction.items[0].count);

        const products = await hideoutScavcaseProduction.generateRewards();

        if (itemTaken) {
            output.items.change = itemTaken.changed;
            output.items.removed = itemTaken.removed;
            playerProfile.character.Hideout.Production[hideoutScavcaseProduction._id] = {
                Progress: 0,
                inProgress: true,
                RecipeId: moveAction.recipeId,
                Products: products,
                SkipTime: 0,
                ProductionTime: Number(hideoutScavcaseProduction.ProductionTime),
                StartTimestamp: await getCurrentTimestamp()
            };
        } else {
            await logger.error(`[scavcaseProductionStart] Couldn't take money with id ${moveAction.items[0].id}`);
        }
        return output;
    }

    static async takeProduction(moveAction = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // TODO: HANDLE STACK FOR BULLETS & BULLETS PACKS
        let itemsAdded;
        const production = await playerProfile.character.getHideoutProductionById(moveAction.recipeId);
        if (!production.hasOwnProperty("Products")) {
            await logger.error(`[takeProduction] Remanent productions error: no products for production with Id ${moveAction.recipeId}`);
            if (!production.continuous) {
                await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
            }
            return output;
        }
        for (const product of production.Products) {
            if (!product.count) {
                product.count = 1;
            }
            const itemTemplate = await Item.get(product._tpl);
            const container = playerProfile.character.getInventoryItemByID(await playerProfile.character.getStashContainer());
            if (await Preset.itemHasPreset(itemTemplate._id)) {
                const itemPresets = await Preset.getPresetsForItem(itemTemplate._id);
                const itemPreset = Object.values(itemPresets).find(preset => preset._encyclopedia);
                const basedChildren = await Item.prepareChildrenForAddItem(itemPreset._items[0], itemPreset._items);
                itemsAdded = await playerProfile.character.addItem(container, itemTemplate._id, basedChildren, product.count, true);
            } else {
                itemsAdded = await playerProfile.character.addItem(container, itemTemplate._id, undefined, product.count, true);
            }
            if (itemsAdded) {
                output.items.new = output.items.new.concat(itemsAdded);
            }
        }
        if (!production.continuous) {
            await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
        } else {
            production.Products = [];
        }
        return output;
    }

}

module.exports.HideoutController = HideoutController;

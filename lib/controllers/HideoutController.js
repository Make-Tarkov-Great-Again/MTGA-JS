const { getCurrentTimestamp, logger, generateMongoID, Response } = require("../utilities");
const { HideoutArea } = require('../models/HideoutArea');
const { HideoutProduction } = require('../models/HideoutProduction');
const { HideoutScavcase } = require('../models/HideoutScavcase');
const { Preset } = require('../models/Preset');
const { Item } = require('../models/Item');


class HideoutController {

    static async hideoutActions(moveAction, reply, playerProfile) {
        switch (moveAction.Action) {
            case "HideoutUpgrade":
                return this.startUpgradeArea(moveAction, reply, playerProfile);
            case "HideoutUpgradeComplete":
                return this.completeUpgradeArea(moveAction, reply, playerProfile);
            case "HideoutPutItemsInAreaSlots":
                return this.addItemToAreaSlot(moveAction, reply, playerProfile);
            case "HideoutTakeItemsFromAreaSlots":
                return this.takeItemFromAreaSlot(moveAction, reply, playerProfile);
            case "HideoutToggleArea":
                return this.toggleArea(moveAction, reply, playerProfile);
            case "HideoutSingleProductionStart":
                return this.singleProductionStart(moveAction, reply, playerProfile);
            case "HideoutContinuousProductionStart":
                return this.continuousProductionStart(moveAction, reply, playerProfile);
            case "HideoutScavCaseProductionStart":
                return this.scavcaseProductionStart(moveAction, reply, playerProfile);
            case "HideoutTakeProduction":
                return this.takeProduction(moveAction, reply, playerProfile);
            default:
                logger.warn("[/client/game/profile/items/moving] Action " + moveAction.Action + " is not yet implemented.");
        }
    }

    static async clientHideoutSettings(_request = null, reply = null) {
        const { database: { core: { hideoutSettings } } } = require('../../app');
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(hideoutSettings)
        );
    }

    static async clientHideoutAreas(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(await HideoutArea.getAllWithoutKeys())
        );
    }

    static async clientHideoutProductionRecipes(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(await HideoutProduction.getAllWithoutKeys())
        );
    }

    static async clientHideoutProductionScavcaseRecipes(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(await HideoutScavcase.getAllWithoutKeys())
        );
    }

    static async startUpgradeArea(moveAction = null, _reply = null, playerProfile = null) {
        logger.debug(`[startUpgradeArea]` + moveAction);
        if (playerProfile) {
            const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
            const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

            if (!templateHideoutArea) {
                logger.error(`[startUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
                return;
            }

            if (!characterHideoutArea) {
                logger.error(`[startUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
                return;
            }

            const nextLevel = characterHideoutArea.level + 1;
            if (typeof templateHideoutArea.stages[nextLevel] === "undefined") {
                logger.error(`[startUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. The level ${nextLevel} doesn't exist.`);
                return;
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
                const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
                if (templateHideoutAreaStage.constructionTime > 0) {
                    const currentTime = await getCurrentTimestamp();
                    characterHideoutArea.completeTime = ~~(currentTime + templateHideoutAreaStage.constructionTime);
                    characterHideoutArea.constructing = true;
                }

                return output;
            } else {
                // How do return custom error to client!!1!1!!!111!elf?
                logger.error(`[startUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. Unable to take required items.`);
                return;
            }
        }
    }

    static async completeUpgradeArea(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const templateHideoutArea = await HideoutArea.getBy("type", moveAction.areaType);
            const characterHideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);

            if (!templateHideoutArea) {
                logger.error(`[completeUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in hideoutArea database.`);
                return;
            }

            if (!characterHideoutArea) {
                logger.error(`[completeUpgradeArea] Upgrading HideoutArea failed. Unknown hideout area ${moveAction.areaType} in character profile.`);
                return;
            }
            const nextLevel = characterHideoutArea.level + 1;
            const templateHideoutAreaStage = templateHideoutArea.stages[nextLevel];
            if (typeof templateHideoutAreaStage === "undefined") {
                logger.error(`[completeUpgradeArea] Upgrading HideoutArea ${templateHideoutArea._id} for character ${playerProfile.character._id} failed. The level ${nextLevel} doesn't exist.`);
                return;
            }

            characterHideoutArea.level = nextLevel;
            characterHideoutArea.completeTime = 0;
            characterHideoutArea.constructing = false;

            const hideoutBonuses = templateHideoutAreaStage.bonuses;

            if (typeof hideoutBonuses !== "undefined" && hideoutBonuses.length > 0) {
                for (const hideoutBonus of hideoutBonuses) {
                    if (await playerProfile.character.applyHideoutBonus(hideoutBonus)) {
                        logger.debug("applyHideoutBonus??????")
                    }
                }
            }
        }
    }

    static async addItemToAreaSlot(moveAction = null, _reply = null, playerProfile = null) {
        const output = { items: { new: [], change: [], del: [] } };
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.logError(`[addItemToAreaSlot] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
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
        }
        return output;
    }

    static async takeItemFromAreaSlot(moveAction = null, _reply = null, playerProfile = null) {
        const output = { items: { new: [], change: [], del: [] } };
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.error(`[takeItemFromAreaSlot] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
                return output;
            }

            for (const slot of moveAction.slots) {
                for (const item of hideoutArea.slots[slot].item) {
                    let itemAdded = false
                    if (typeof item.upd !== "undefined") {
                        itemAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), item._tpl, false, 1, undefined, item.upd);
                    } else {
                        itemAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), item._tpl, false, 1);
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
        }
        return output;
    }

    static async toggleArea(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
            if (!hideoutArea) {
                logger.error(`[toggleArea] Unable to find hideout area type ${moveAction.areaType} for playerProfile ${playerProfile.character._id}.`);
                return;
            }

            await hideoutArea.setActive(moveAction.enabled);
        }
    }

    static async singleProductionStart(moveAction = null, _reply = null, playerProfile = null) {
        logger.debug(`[singleProductionStart]` + moveAction);
        if (playerProfile) {
            const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
            if (!hideoutProductionTemplate) {
                logger.error(`[singleProductionStart] Starting hideout production failed. Unknown hideout production with Id ${moveAction.recipeId} in hideoutProduction database.`);
                return;
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
                /*await trader.reduceStock(requestEntry.item_id, requestEntry.count);*/
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

                const products = [{
                    _id: await generateMongoID(),
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
                logger.error(`[singleProductionStart] Starting hideout production for recepie with Id ${moveAction.recipeId} failed. Unable to take required items.`);
                return;
            }
        }
    }

    static async continuousProductionStart(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
            if (!hideoutProductionTemplate) {
                logger.error(`[continuousProductionStart] Couldn't start hideout production. Unknown production with Id ${moveAction.recipeId}`);
                return;
            }

            let productionTime = 0
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
    }

    static async scavcaseProductionStart(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const hideoutScavcaseProduction = await HideoutScavcase.get(moveAction.recipeId);
            if (!hideoutScavcaseProduction) {
                logger.error(`[scavcaseProductionStart] Couldn't start scavcase. Unknown hideout scavcase with Id ${moveAction.recipeId}`);
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
                logger.error(`[scavcaseProductionStart] Couldn't take money with id ${moveAction.items[0].id}`);
            }
        }
        return output;
    }

    static async takeProduction(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // TODO: HANDLE STACK FOR BULLETS & BULLETS PACKS
        if (playerProfile) {
            let itemsAdded;
            const production = await playerProfile.character.getHideoutProductionById(moveAction.recipeId);
            if (!production.hasOwnProperty("Products")) {
                logger.error(`[takeProduction] Remanent productions error: no products for production with Id ${moveAction.recipeId}`);
                if(!production.continuous) {
                    await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
                }
                return output;
            }
            for (const product of production.Products) {
                if (!product.count) {
                    product.count = 1;
                }
                const itemTemplate = await Item.get(product._tpl);
                if (await Preset.itemHasPreset(itemTemplate._id)) {
                    const itemPresets = await Preset.getPresetsForItem(itemTemplate._id);
                    const itemPreset = Object.values(itemPresets).find(preset => preset._encyclopedia);
                    const basedChildren = await Item.prepareChildrenForAddItem(itemPreset._items[0], itemPreset._items);
                    itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), itemTemplate._id, basedChildren, product.count, true);
                } else {
                    itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), itemTemplate._id, undefined, product.count, true);
                }
                if (itemsAdded) {
                    output.items.new = output.items.new.concat(itemsAdded);
                }
            }
            if(!production.continuous) {
                await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
            } else {
                production.Products = [];
            }
        }
        return output;
    }

}

module.exports.HideoutController = HideoutController;
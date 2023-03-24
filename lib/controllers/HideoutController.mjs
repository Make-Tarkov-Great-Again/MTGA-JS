import { getCurrentTimestamp, logger, generateMongoID, Response } from "../utilities/_index.mjs";
import { Hideout, Item } from '../classes/_index.mjs';
/* import { HideoutArea } from '../models/HideoutArea';
import { HideoutProduction } from '../models/HideoutProduction';
import { HideoutScavcase } from '../models/HideoutScavcase';
import { Preset } from '../models/Preset';
import { Item } from '../models/Item'; */


export class HideoutController {

    static async hideoutActions(moveAction, character, characterChanges) {
        logger.warn(`[HideoutController] ${moveAction}`);
        switch (moveAction.Action) {
            case "HideoutUpgrade":
                await Hideout.upgradeArea(character, moveAction, characterChanges);
                break;
            case "HideoutUpgradeComplete":
                Hideout.completeUpgrade(character, moveAction, characterChanges);
                break;
            case "HideoutImproveArea":
                await Hideout.improveArea(character, moveAction, characterChanges);
                break;
            case "HideoutPutItemsInAreaSlots":
                await Hideout.addItemToAreaSlot(character, moveAction, characterChanges);
                break;
            case "HideoutTakeItemsFromAreaSlots":
                await Hideout.takeItemFromAreaSlot(character, moveAction, characterChanges);
                break;
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
            default:
                logger.error(`[HideoutController.hideoutActions] No handler for action ${moveAction}`);
                return false;
        }
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
        logger.info(`nah son nah`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("empty")
        );
    }

    static async clientHideoutQTEList(reply) {
        const qte = await Hideout.getHideoutQTEList();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: qte }
        );
    }

    static async clientHideoutSettings(reply) {
        const hideoutSettings = await Hideout.getHideoutSettings();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutSettings }
        );
    }

    static async clientHideoutAreas(reply) {
        const hideoutAreas = await Hideout.getAllHideoutAreas();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutAreas }
        );
    }

    static async clientHideoutProductionRecipes(reply) {
        const hideoutProductions = await Hideout.getAllHideoutProductions();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutProductions }
        );
    }

    static async clientHideoutProductionScavcaseRecipes(reply) {
        const scavcaseRecipes = await Hideout.getAllScavcaseRecipes();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: scavcaseRecipes }
        );
    }

    static async toggleArea(moveAction = null, playerProfile = null) {
        const hideoutArea = await playerProfile.character.getHideoutAreaByType(moveAction.areaType);
        if (!hideoutArea) {
            logger.error(`[toggleArea] Unable to find hideout area type ${moveAction.areaType}.`);
            return false;
        }

        await hideoutArea.setActive(moveAction.enabled);
    }

    static async singleProductionStart(moveAction = null, playerProfile = null) {
        logger.info(`[singleProductionStart]` + moveAction);
        const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
        if (!hideoutProductionTemplate) {
            logger.error(`[singleProductionStart] Starting hideout production failed. Unknown hideout production with Id ${moveAction.recipeId}.`);
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
                logger.error(`[singleProductionStart] Starting hideout production for recepie with Id ${moveAction.recipeId} failed. Unable to take required items.`);
                return false;
            }
            if (typeof itemTaken.changed !== "undefined") {
                output.items.change = output.items.change.concat(itemTaken.changed);
            }

            if (typeof itemTaken.removed !== "undefined") {
                output.items.del = output.items.del.concat(itemTaken.removed);
            }
        }

        let productionTime = 0;

        if (typeof hideoutProductionTemplate.ProductionTime !== "undefined") {
            productionTime = hideoutProductionTemplate.ProductionTime;
        } else if (typeof hideoutProductionTemplate.productionTime !== "undefined") {
            productionTime = hideoutProductionTemplate.productionTime;
        }

        if (!hideoutProductionTemplate.count) {
            hideoutProductionTemplate.count = 1;
        }

        const productId = generateMongoID();
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
            StartTimestamp: getCurrentTimestamp()
        };

        return output;
    }

    static async continuousProductionStart(moveAction = null, playerProfile = null) {
        const hideoutProductionTemplate = await HideoutProduction.get(moveAction.recipeId);
        if (!hideoutProductionTemplate) {
            logger.error(`[continuousProductionStart] Couldn't start hideout production. Unknown production with Id ${moveAction.recipeId}`);
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
            StartTimestamp: getCurrentTimestamp()
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
                StartTimestamp: getCurrentTimestamp()
            };
        } else {
            logger.error(`[scavcaseProductionStart] Couldn't take money with id ${moveAction.items[0].id}`);
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
            logger.error(`[takeProduction] Remanent productions error: no products for production with Id ${moveAction.recipeId}`);
            if (!production.continuous) {
                await playerProfile.character.removeHideoutProductionById(moveAction.recipeId);
            }
            return output;
        }
        for (const product of production.Products) {
            if (!product.count) {
                product.count = 1;
            }
            const itemTemplate = Item.get(product._tpl);
            const container = await playerProfile.character.getInventoryItemByID(await playerProfile.character.getStashContainer());
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

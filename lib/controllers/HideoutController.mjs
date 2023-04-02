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
            case "HideoutSingleProductionStart":
                Hideout.singleProductionStart(character, moveAction, characterChanges);
                break;
            case "HideoutToggleArea":
                Hideout.toggleArea(character, moveAction, characterChanges);
                break;
            case "HideoutTakeProduction":
                Hideout.takeProduction(character, moveAction, characterChanges);
                break;
            case "HideoutContinuousProductionStart":
                Hideout.continuousProductionStart(character, moveAction, characterChanges);
                break;
            case "HideoutScavCaseProductionStart":
                return this.scavcaseProductionStart(moveAction, playerProfile);
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

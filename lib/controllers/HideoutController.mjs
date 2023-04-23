import { logger } from "../utilities/_index.mjs";
import { Hideout, Item, Response } from '../classes/_index.mjs';
/* import { HideoutArea } from '../models/HideoutArea';
import { HideoutProduction } from '../models/HideoutProduction';
import { HideoutScavcase } from '../models/HideoutScavcase';
import { Preset } from '../models/Preset';
import { Item } from '../models/Item'; */


export class HideoutController {

    static hideoutActions(moveAction, character, characterChanges) {
        logger.warn(`[HideoutController] ${moveAction.Action}`);
        switch (moveAction.Action) {
            case "HideoutUpgrade":
                Hideout.upgradeArea(character, moveAction, characterChanges);
                break;
            case "HideoutUpgradeComplete":
                Hideout.completeUpgrade(character, moveAction, characterChanges);
                break;
            case "HideoutImproveArea":
                Hideout.improveArea(character, moveAction, characterChanges);
                break;
            case "HideoutPutItemsInAreaSlots":
                Hideout.addItemToAreaSlot(character, moveAction, characterChanges);
                break;
            case "HideoutTakeItemsFromAreaSlots":
                Hideout.takeItemFromAreaSlot(character, moveAction, characterChanges);
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
                Hideout.scavcaseProductionStart(character, moveAction, characterChanges);
                break;
            case "RecordShootingRangePoints":
                Hideout.recordShootingRangeScore(character, moveAction, characterChanges);
                break;
            default:
                logger.error(`[HideoutController.hideoutActions] No handler for action ${moveAction}`);
                return false;
        }
    }

    static async clientHideoutWorkout(request, reply) {
        logger.info(`nah son nah`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("empty")
        );
    }

    static clientHideoutQTEList(reply) {
        const qte = Hideout.getHideoutQTEList();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: qte }
        );
    }

    static clientHideoutSettings(reply) {
        const hideoutSettings = Hideout.getHideoutSettings();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutSettings }
        );
    }

    static clientHideoutAreas(reply) {
        const hideoutAreas = Hideout.getAllHideoutAreas();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutAreas }
        );
    }

    static clientHideoutProductionRecipes(reply) {
        const hideoutProductions = Hideout.getAllHideoutProductions();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: hideoutProductions }
        );
    }

    static clientHideoutProductionScavcaseRecipes(reply) {
        const scavcaseRecipes = Hideout.getAllScavcaseRecipes();
        return Response.zlibJsonReply(
            reply,
            { err: 0, data: scavcaseRecipes }
        );
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

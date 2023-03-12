import {
    ItemController, TradeController, HideoutController,
    ProfileController, NoteController, PresetController,
    InsuranceController, QuestController, RepairController,
    RichPresenseController
} from "./_index.mjs";

import { logger, Response } from "../utilities/_index.mjs";
import { Profile, Character } from "../classes/_index.mjs";


export class MoveController {

    static async clientGameProfileItemsMoving(request, reply) {
        const sessionID = await Response.getSessionID(request);
        if (!sessionID) {
            logger.error(`[/client/game/profile/items/moving] Could not get session Id from request.`);
            return false;
        }

        const playerProfile = Profile.get(sessionID);
        if (!playerProfile) {
            logger.error(`[/client/game/profile/items/moving] Unable to get player profile for sessionID ${sessionID}.`);
            return false;
        }

        const outputData = await Character.getChangesTemplate(playerProfile.character);
        const characterChanges = outputData.profileChanges[playerProfile.character._id];

        const length = request.body.data.length;
        for (let a = 0; a < length; a++) {
            const moveAction = request.body.data[a];
            switch (moveAction.Action) {
                case "Split":
                case "Merge":
                case "Remove":
                case "Fold":
                case "Move":
                case "Examine":
                case "Tag":
                case "Toggle":
                case "Bind":
                case "Transfer":
                case "Swap":
                case "OpenRandomLootContainer":
                    await RichPresenseController.onStash(sessionID);
                    await ItemController.itemActions(moveAction, playerProfile.character, characterChanges);
                    break;

                case "HideoutUpgrade":
                case "HideoutUpgradeComplete":
                case "HideoutPutItemsInAreaSlots":
                case "HideoutTakeItemsFromAreaSlots":
                case "HideoutToggleArea":
                case "HideoutSingleProductionStart":
                case "HideoutContinuousProductionStart":
                case "HideoutScavCaseProductionStart":
                case "HideoutTakeProduction":
                case "RecordShootingRangePoints":
                case "HideoutImproveArea":
                    await RichPresenseController.OnHideout(sessionID);
                    await HideoutController.hideoutActions(moveAction, playerProfile.character, characterChanges);
                    break;

                case "AddNote":
                case "EditNote":
                case "DeleteNote":
                    await NoteController.noteActions(moveAction, playerProfile.character, characterChanges);
                    break;

                case "RestoreHealth":
                case "Heal":
                case "Eat":
                case "ReadEncyclopedia":
                case "AddToWishList":
                case "RemoveFromWishList":
                case "ResetWishList":
                case "CustomizationWear":
                case "ApplyInventoryChanges":
                    await ProfileController.profileActions(moveAction, playerProfile, characterChanges);
                    break;

                case "QuestAccept":
                case "QuestHandover":
                case "QuestComplete":
                    await QuestController.questActions(moveAction, playerProfile.character, characterChanges);
                    break;

                case "CustomizationBuy":
                case "RagFairBuyOffer":
                case "TradingConfirm":
                    await TradeController.confirmTrade(moveAction, playerProfile.character, characterChanges);
                    break;

                case "Repair":
                case "TraderRepair":
                    await RepairController.repairActions(moveAction, playerProfile.character, characterChanges);
                    break;

                case "SaveBuild":
                case "RemoveBuild":
                    await PresetController.presetActions(moveAction, playerProfile.character);
                    break;

                case "Insure":
                    await InsuranceController.insureItems(moveAction, playerProfile.character, characterChanges);
                    break;

                case "RagFairAddOffer":
                case "CreateMapMarker": //nobody
                case "DeleteMapMarker": //uses
                case "EditMapMarker": //maps
                default:
                    logger.warn("[/client/game/profile/items/moving] Action " + moveAction.Action + " is not yet implemented.");
            }
        }

        await Profile.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(outputData));
    }
}
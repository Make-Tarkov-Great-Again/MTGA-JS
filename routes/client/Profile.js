const { GameController } = require("../../lib/controllers");
const { ItemController } = require("../../lib/controllers");
const { Profile } = require("../../lib/models/Profile");
const { logger, FastifyResponse } = require("../../utilities");

module.exports = async function profileRoutes(app, _opts) {

    app.post("/client/profile/status", async (request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const playerProfile = await Profile.get(sessionID);
        const playerPMC = await playerProfile.getPmc();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
                maxPveCountExceeded: false,
                profiles: [
                    {
                        profileid: playerPMC.savage,
                        profileToken: null,
                        status: "Free",
                        sid: "",
                        ip: "",
                        port: 0
                    },
                    {
                        profileid: playerPMC._id,
                        profileToken: null,
                        status: "Free",
                        sid: "",
                        ip: "",
                        port: 0
                    }
                ]
            })
        );
    });

    app.post("/client/game/profile/list", async (request, reply) => {
        await GameController.clientProfileList(request, reply);
    });

    app.post("/client/game/profile/select", async (request, reply) => {
        await GameController.clientProfileSelect(request, reply);
    });

    app.post("/client/game/profile/nickname/reserved", async (request, reply) => {
        await GameController.clientGameProfileNicknameReserved(request, reply);
    });

    app.post("/client/game/profile/nickname/validate", async (request, reply) => {
        await GameController.clientGameProfileNicknameValidate(request, reply);
    });

    app.post("/client/game/profile/nickname/change", async (request, reply) => {
        await GameController.clientGameProfileNicknameChange(request, reply);
    });

    app.post("/client/game/profile/create", async (request, reply) => {
        await GameController.clientGameProfileCreate(request, reply);
    });

    app.post("/client/game/profile/voice/change", async (request, reply) => {
        await GameController.clientGameProfileVoiceChange(request, reply);
    });

    app.post(`/client/game/profile/items/moving`, async (request, reply) => {
        const sessionId = await FastifyResponse.getSessionID(request);
        if (!sessionId) {
            logger.logError(`[/client/game/profile/items/moving] Could not get session Id from request.`)
            return false;
        }

        const playerProfile = await Profile.get(sessionId);
        if (!playerProfile) {
            logger.logError(`[/client/game/profile/items/moving] Unable to get player profile for sessionId ${sessionId}.`)
            return false;
        }

        const outputData = await playerProfile.getProfileChangesBase();
        let actionResult;
        for (const moveAction of request.body.data) {
            const action = moveAction.Action;
            switch (action) {
                case "Split":
                    actionResult = await ItemController.splititem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Merge":
                    actionResult = await ItemController.mergeItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Remove":
                    actionResult = await ItemController.removeItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Fold":
                    actionResult = await ItemController.foldItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Move":
                    actionResult = await ItemController.moveItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Examine":
                    actionResult = await ItemController.examineItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Tag":
                    actionResult = await ItemController.tagItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Toggle":
                    actionResult = await ItemController.toggleItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Bind":
                    actionResult = await ItemController.bindItem(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "QuestAccept":
                    actionResult = await GameController.clientGameProfileAcceptQuest(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "RagFairBuyOffer":
                case "TradingConfirm":
                    actionResult = await GameController.clientGameProfileTradingConfirm(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "ReadEncyclopedia":
                    actionResult = await GameController.clientGameProfileReadEncyclopedia(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutUpgrade":
                    actionResult = await GameController.clientGameProfileHideoutUpgrade(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutUpgradeComplete":
                    actionResult = await GameController.clientGameProfileHideoutUpgradeComplete(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutPutItemsInAreaSlots":
                    actionResult = await GameController.clientGameProfileHideoutPutItemsInAreaSlots(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutTakeItemsFromAreaSlots":
                    actionResult = await GameController.clientGameProfileHideoutTakeItemsFromAreaSlots(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutToggleArea":
                    actionResult = await GameController.clientGameProfileHideoutToggleArea(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutSingleProductionStart":
                    actionResult = await GameController.clientGameProfileHideoutSingleProductionStart(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutContinuousProductionStart":
                    actionResult = await GameController.clientGameProfileHideoutContinuousProductionStart(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "AddNote":
                    actionResult = await GameController.clientGameProfileAddNote(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "EditNote":
                    actionResult = await GameController.clientGameProfileEditNote(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "DeleteNote":
                    actionResult = await GameController.clientGameProfileRemoveNote(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "ResetWishList":
                    actionResult = await GameController.clientGameProfileResetWishList(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutScavCaseProductionStart":
                    actionResult = await GameController.clientGameProfileHideoutScavCaseProductionStart(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "HideoutTakeProduction":
                    actionResult = await GameController.clientGameProfileHideoutTakeProduction(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "CustomizationBuy":
                    actionResult = await GameController.clientGameProfileCustomizationBuy(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesBase(actionResult, outputData);
                    break;
                case "CustomizationWear":
                    actionResult = await GameController.clientGameProfileCustomizationWear(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesBase(actionResult, outputData);
                    break;
                case "RestoreHealth":
                    actionResult = await GameController.clientGameProfileRestoreHealth(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Heal":
                    actionResult = await GameController.clientGameProfileHeal(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Eat":
                    actionResult = await GameController.clientGameProfileEat(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "TraderRepair":
                    actionResult = await GameController.clientGameTraderRepair(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "SaveBuild":
                    actionResult = await GameController.clientGameSaveBuildPreset(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "RemoveBuild":
                    actionResult = await GameController.clientGameRemoveBuildPreset(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                // more, MOOOOOOOOOOOOOOORE
                case "Insure":
                case "RagFairAddOffer":
                case "AddToWishList":
                case "RemoveFromWishList":
                case "ApplyInventoryChanges":
                case "Swap":
                case "Transfer":
                case "CreateMapMarker":
                case "QuestComplete":
                case "QuestHandover":
                case "Repair":
                default:
                    logger.logWarning("[/client/game/profile/items/moving] Action " + action + " is not yet implemented.");
            }
        }
        await playerProfile.save();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(outputData));
    });

}

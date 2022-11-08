const {
    ItemController,
    TraderController,
    HideoutController,
    ProfileController,
    NoteController,
    PresetController,
    InsuranceController,
    QuestController,
    RepairController
} = require("../../controllers");

const { Profile } = require("../../models/Profile");
const { logger, Response } = require("../../utilities");

module.exports = async function profileRoutes(app, _opts) {

    app.post("/client/profile/status", async (request, reply) => {
        const { character: { savage, _id } } = await Profile.get(await Response.getSessionID(request));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                maxPveCountExceeded: false,
                profiles: [
                    {
                        profileid: savage,
                        profileToken: null,
                        status: "Free",
                        sid: "",
                        ip: "",
                        port: 0
                    },
                    {
                        profileid: _id,
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
        await ProfileController.profileList(request, reply);
    });

    app.post("/client/game/profile/select", async (request, reply) => {
        await ProfileController.profileSelect(request, reply);
    });

    app.post("/client/game/profile/nickname/reserved", async (request, reply) => {
        await ProfileController.profileNicknameReserved(request, reply);
    });

    app.post("/client/game/profile/nickname/validate", async (request, reply) => {
        await ProfileController.profileNicknameValidate(request, reply);
    });

    app.post("/client/game/profile/nickname/change", async (request, reply) => {
        await ProfileController.profileNicknameChange(request, reply);
    });

    app.post("/client/game/profile/create", async (request, reply) => {
        await ProfileController.profileCreate(request, reply);
    });

    app.post("/client/game/profile/voice/change", async (request, reply) => {
        await ProfileController.profileVoiceChange(request, reply);
    });

    app.post(`/client/game/profile/savage/regenerate`, async (request, reply) => {
        logger.info(`/client/game/profile/savage/regenerate not implemented`);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        );
    })

    app.post(`/client/game/profile/items/moving`, async (request, reply) => {
        const sessionId = await Response.getSessionID(request);
        if (!sessionId) {
            logger.error(`[/client/game/profile/items/moving] Could not get session Id from request.`)
            return false;
        }

        const playerProfile = await Profile.get(sessionId);
        if (!playerProfile) {
            logger.error(`[/client/game/profile/items/moving] Unable to get player profile for sessionId ${sessionId}.`)
            return false;
        }

        const outputData = await playerProfile.getProfileChangesBase();
        let actionResult;
        for (const moveAction of request.body.data) {
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
                    await playerProfile.getProfileChangesResponse(
                        await ItemController.itemActions(moveAction, reply, playerProfile),
                        outputData
                    );
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
                    await playerProfile.getProfileChangesResponse(
                        await HideoutController.hideoutActions(moveAction, reply, playerProfile),
                        outputData
                    );
                    break;

                case "AddNote":
                case "EditNote":
                case "DeleteNote":
                    await playerProfile.getProfileChangesResponse(
                        await NoteController.noteActions(moveAction, reply, playerProfile),
                        outputData
                    );
                    break;

                case "RestoreHealth":
                case "Heal":
                case "Eat":
                case "ReadEncyclopedia":
                case "AddToWishList":
                case "RemoveFromWishList":
                case "ResetWishList":
                case "CustomizationBuy":
                case "CustomizationWear":
                case "ApplyInventoryChanges":
                    await playerProfile.getProfileChangesResponse(
                        await ProfileController.profileActions(moveAction, reply, playerProfile),
                        outputData
                    );
                    break;

                case "QuestAccept":
                case "QuestHandover":
                case "QuestComplete":
                    await playerProfile.getProfileChangesResponse(
                        await QuestController.questActions(moveAction, reply, playerProfile),
                        outputData
                    );
                    break;

                case "RagFairBuyOffer":
                case "TradingConfirm":
                    actionResult = await TraderController.tradingConfirm(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;


                case "Repair":
                case "TraderRepair":
                    actionResult = await RepairController.repairActions(moveAction, reply, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "SaveBuild":
                    actionResult = await PresetController.savePreset(moveAction, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "RemoveBuild":
                    actionResult = await PresetController.removePreset(moveAction, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                case "Insure":
                    actionResult = await InsuranceController.insureItems(moveAction, playerProfile);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "RagFairAddOffer":
                case "CreateMapMarker": //nobody
                case "DeleteMapMarker": //uses
                case "EditMapMarker": //maps
                default:
                    logger.warn("[/client/game/profile/items/moving] Action " + moveAction.Action + " is not yet implemented.");
            }
            break;
        }
        await playerProfile.save();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(outputData));
    });

}

const { default: stringify } = require("fast-safe-stringify");
const { database } = require("../../app");
const cloneDeep = require("rfdc")();
const { ClientController, GameController, MenuController, TradingController, FriendController } = require("../controllers/client");
const { Weaponbuild, Ragfair, Profile } = require("../models");
const { logger, FastifyResponse, writeFile } = require("../utilities");

module.exports = async function gameRoutes(app, _opts) {

    app.get('/*', { websocket: true }, async (connection, request) => {
        connection.socket.on('message', message => {
            connection.socket.send('hi from wildcard route')
        })
    })

    // Initial entry points for tarkov //
    app.get(`/mode/offline`, async (request, reply) => {
        await GameController.modeOfflinePatches(request, reply);
    });

    app.get(`/mode/offlineNodes`, async (request, reply) => {
        await GameController.modeOfflinePatchNodes(request, reply);
    });


    // Client Game Routes //
    app.post(`/client/game/config`, async (request, reply) => {
        await GameController.clientGameConfig(request, reply);
    });

    app.post(`/client/game/start`, async (request, reply) => {
        await GameController.clientGameStart(request, reply);
    });

    app.post(`/client/game/version/validate`, async (request, reply) => {
        await GameController.clientGameVersionValidate(request, reply);
    });

    app.post("/client/game/profile/list", async (request, reply) => {
        await GameController.clientProfileList(request, reply);
    });

    app.post("/client/game/profile/select", async (request, reply) => {
        await GameController.clientProfileSelect(request, reply);
    });

    app.post("/client/game/keepalive", async (request, reply) => {
        await GameController.clientGameKeepAlive(request, reply);
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

    app.post("/client/game/logout", async (_request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ status: "ok" })
        );
    });

    app.post("/client/game/profile/voice/change", async (request, reply) => {
        await GameController.clientGameProfileVoiceChange(request, reply);
    });

    app.post(`/client/game/profile/items/moving`, async (request, reply) => {
        const sessionID = await FastifyResponse.getSessionID(request);
        const playerProfile = await Profile.get(sessionID);
        const outputData = await playerProfile.getProfileChangesBase();
        let actionResult;
        for (const moveAction of request.body.data) {
            const action = moveAction.Action;
            switch (action) {
                case "QuestAccept":
                    actionResult = await GameController.clientGameProfileAcceptQuest(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Move":
                    actionResult = await GameController.clientGameProfileMoveItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Examine":
                    actionResult = await GameController.clientGameProfileExamine(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "RagFairBuyOffer":
                case "TradingConfirm":
                    actionResult = await GameController.clientGameProfileTradingConfirm(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Split":
                    actionResult = await GameController.clientGameProfileSplitItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Merge":
                    actionResult = await GameController.clientGameProfileMergeItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Remove":
                    actionResult = await GameController.clientGameProfileRemoveItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Fold":
                    actionResult = await GameController.clientGameProfileFoldItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Tag":
                    actionResult = await GameController.clientGameProfileTagItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Toggle":
                    actionResult = await GameController.clientGameProfileToggleItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Bind":
                    actionResult = await GameController.clientGameProfileBindItem(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "ReadEncyclopedia":
                    actionResult = await GameController.clientGameProfileReadEncyclopedia(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "HideoutUpgrade":
                    actionResult = await GameController.clientGameProfileHideoutUpgrade(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "HideoutUpgradeComplete":
                    actionResult = await GameController.clientGameProfileHideoutUpgradeComplete(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "HideoutPutItemsInAreaSlots":
                    actionResult = await GameController.clientGameProfileHideoutAreaSlot(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "HideoutSingleProductionStart":
                    actionResult = await GameController.clientGameProfileHideoutSingleProductionStart(moveAction, reply, sessionID);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                // more, MOOOOOOOOOOOOOOORE
                case "Insure":
                case "RagFairAddOffer":
                case "AddToWishList":
                default:
                    logger.logWarning("Action " + action + " is not yet implemented.");
            }
        }
        await playerProfile.save();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(outputData));
    });

    app.post('/client/game/bot/generate', async (request, reply) => {
        logger.logDebug("Generating bot profiles not implemented yet - sending empty []");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        );
    });


    // Client Account Routes //
    app.post("/client/account/customization", async (request, reply) => {
        await ClientController.clientAccountCustomization(request, reply);
    });


    // Client Notifier Routes //
    app.post("/client/notifier/channel/create", async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(FastifyResponse.getNotifier(await FastifyResponse.getSessionID(request)))
        );
    });

    // Client Profile Routes //
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

    // Client Handbook Routes //
    app.post("/client/handbook/templates", async (_request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.templates));
    });

    app.post(`/client/handbook/builds/my/list`, async (_request, reply) => {
        const output = await Weaponbuild.getAllWithoutKeys();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output));
    });

    // Client Menu Routes //
    app.post(`/client/menu/locale/:language`, async (request, reply) => {
        await MenuController.clientMenuLocale(request, reply);
    });

    app.post(`/client/locale/:language`, async (request, reply) => {
        await ClientController.clientLocale(request, reply);
    });

    // Trading Routes //
    app.post(`/client/trading/api/getTradersList`, async (request, reply) => {
        await TradingController.clientTradingApiGetTradersList(request, reply);
    });

    app.post(`/client/trading/api/traderSettings`, async (request, reply) => {
        await TradingController.clientTradingApiTraderSettings(request, reply);
    });

    app.post(`/client/trading/customization/storage`, async (request, reply) => {
        await TradingController.getStoragePath(request, reply);
    });

    app.post(`/client/trading/api/getTraderAssort/:traderId`, async (request, reply) => {
        await TradingController.getTraderAssort(request, reply);
    });

    app.post(`/client/trading/api/getUserAssortPrice/trader/:traderId`, async (request, reply) => {
        await TradingController.getUserAssortPrice(request, reply);
    });

    // Ungrouped routes //
    app.post(`/client/customization`, async (request, reply) => {
        await ClientController.clientCustomization(request, reply);
    });

    app.post(`/client/items`, async (request, reply) => {
        await ClientController.clientItems(request, reply);
    });

    app.post(`/client/languages`, async (request, reply) => {
        await ClientController.clientLanguages(request, reply);
    });

    app.post(`/client/globals`, async (request, reply) => {
        await ClientController.clientGlobals(request, reply);
    });

    app.post(`/client/settings`, async (request, reply) => {
        await ClientController.clientSettings(request, reply);
    });

    app.post(`/client/weather`, async (request, reply) => {
        await ClientController.clientWeather(request, reply);
    });

    app.post(`/client/locations`, async (request, reply) => {
        await ClientController.clientLocations(request, reply);
    });

    app.post(`/client/quest/list`, async (request, reply) => {
        await ClientController.clientQuestList(request, reply);
    });

    app.post(`/client/repeatalbeQuests/activityPeriods`, async (request, reply) => {
        logger.logWarning("RepeatalbeQuests are not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([]));
    });

    app.post(`/client/server/list`, async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([{ ip: database.core.serverConfig.ip, port: database.core.serverConfig.port }]));
    });

    app.post(`/client/checkVersion`, async (request, reply) => {
        const version = await FastifyResponse.getVersion(request);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ isValid: true, latestVersion: version })
        );
    });

    // hideout routes

    app.post(`/client/hideout/areas`, async (request, reply) => {
        await ClientController.clientHideoutAreas(request, reply);
    });

    app.post(`/client/hideout/production/recipes`, async (request, reply) => {
        await ClientController.clientHideoutProductionRecipes(request, reply);
    });

    app.post(`/client/hideout/production/scavcase/recipes`, async (request, reply) => {
        await ClientController.clientHideoutProductionScavcaseRecipes(request, reply);
    });

    app.post(`/client/hideout/settings`, async (request, reply) => {
        await ClientController.clientHideoutSettings(request, reply);
    });

    // Client Friends Routes //
    app.post(`/client/friend/list`, async (request, reply) => {
        logger.logWarning("Friend List not implemented yet")
        await FriendController.clientFriendRequestList(request, reply);
    });
    app.post(`/client/friend/request/list/inbox`, async (request, reply) => {
        logger.logWarning("Inbox is not implemented yet");
        await FriendController.clientFriendRequestListInbox(request, reply);
    });
    app.post(`/client/friend/request/list/outbox`, async (request, reply) => {
        logger.logWarning("Outbox not implemented yet");
        await FriendController.clientFriendRequestListOutbox(request, reply);
    });


    // Client Mail Routes //
    app.post(`/client/mail/dialog/list`, async (request, reply) => {
        logger.logWarning("Dialog List not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        );
    });


    // Client Ragfair Routes //
    app.post(`/client/ragfair/find`, async (request, reply) => {
        console.log(request.body);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Ragfair.generateOffersBasedOnRequest(request.body))
        );
    });

    // Client Raid Routes //
    app.post(`/client/raid/person/killed/showMessage`, async (request, reply) => {
        return logger.logDebug("Raid person killed show message not implemented yet");
    });
    app.post(`/client/raid/createFriendlyAI`, async (request, reply) => {
        return logger.logDebug("Raid create friendly AI not implemented yet");
    });

    app.post(`/client/raid/bots/getNewProfile`, async (request, reply) => {
        return logger.logDebug("Raid bots get new profile not implemented yet");
    });

    app.post(`/client/raid/person/lootingContainer`, async (request, reply) => {
        return stringify("")
    });


    // Client Match Routes //
    app.post(`/client/match/offline/start`, async (request, reply) => {
        console.log(request.body)
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post(`/client/match/offline/end`, async (request, reply) => {
        console.log(request.body)
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null, 0, null)
        );
    });

    app.post("/client/match/available", async (request, reply) => {
        logger.logDebug("Match available not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(true)
        );
    });

    app.post(`/client/match/join`, async (_request, reply) => {
        logger.logDebug("Match join not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(null)
        );
    });



    // Client Location Routes //
    app.post(`/client/location/getLocalloot`, async (request, reply) => {
        console.log(request.body)

        const name = request.body.locationId.toLowerCase();
        const variant = request.body.variantId;
        const locations = database.locations;
        if (locations[name]) {
            const location = locations[name][variant];
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(location)
            );
        }
        return logger.logDebug("Location get local loot not implemented yet");
    });


}

const { default: stringify } = require("fast-safe-stringify");
const { database } = require("../../app");
const cloneDeep = require("rfdc")();
const { ClientController, GameController, MenuController, TradingController, FriendController } = require("../controllers/client");
const { Weaponbuild, Ragfair, Profile } = require("../models");
const { logger, FastifyResponse, writeFile } = require("../utilities");
const { logDebug } = require("../utilities/logger");

module.exports = async function gameRoutes(app, _opts) {

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
        for (const moveActions of request.body.data) {
            const action = moveActions.Action;
            switch (action) {
                case "QuestAccept":
                    actionResult = await GameController.clientGameProfileAcceptQuest(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Move":
                    actionResult = await GameController.clientGameProfileMoveItem(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Examine":
                    actionResult = await GameController.clientGameProfileExamine(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "TradingConfirm":
                    actionResult = await GameController.clientGameTradingConfirm(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Split":
                    actionResult = await GameController.clientGameSplitItem(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Merge":
                    actionResult = await GameController.clientGameMergeItem(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;

                case "Remove":
                    actionResult = await GameController.clientGameRemoveItem(request, reply);
                    await playerProfile.getProfileChangesResponse(actionResult, outputData);
                    break;
                    
                // more, MOOOOOOOOOOOOOOORE
                default:
                    logger.logWarning("Action " + action + " is not yet implemented.");
            }
        }
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(outputData));
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
        logger.logWarning("Find not implemented yet");
        console.log(request.body);

        let ragfair = cloneDeep(database.ragfair);

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(ragfair)
        );
    });

}

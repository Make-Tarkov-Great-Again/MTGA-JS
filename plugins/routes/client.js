const { database } = require("../../app");
const { ClientController, GameController, MenuController, TradingController, FriendController } = require("../controllers/client");
const { Weaponbuild } = require("../models");
const { logger, FastifyResponse } = require("../utilities");

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
        const action = request.body.data[0].Action;
        switch (action) {
            case "QuestAccept":
                await GameController.clientGameProfileAcceptQuest(request, reply);
                break;
            default:
                logger.logWarning("not implemented yet");
        }
        console.log()
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
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
                maxPveCountExceeded: false,
                profiles: [
                    {
                        profileid: "scav" + sessionID,
                        profileToken: null,
                        status: "Free",
                        sid: "",
                        ip: "",
                        port: 0,
                    },
                    {
                        profileid: "pmc" + sessionID,
                        profileToken: null,
                        status: "Free",
                        sid: "",
                        ip: "",
                        port: 0,
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
        console.log()
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
        )
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

}

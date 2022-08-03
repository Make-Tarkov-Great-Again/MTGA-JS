const { default: stringify } = require("fast-safe-stringify");

const { ClientController, GameController, MenuController, LocationController } = require("../lib/controllers");
const { Weaponbuild, Ragfair, Profile } = require("../lib/models");
const { logger, FastifyResponse, writeFile } = require("../utilities");

module.exports = async function gameRoutes(app, _opts) {

    // Initial entry points for tarkov //
    app.get(`/mode/offline`, async (request, reply) => {
        await GameController.modeOfflinePatches(request, reply);
    });

    app.get(`/mode/offlineNodes`, async (request, reply) => {
        await GameController.modeOfflinePatchNodes(request, reply);
    });

    // Client Account Routes //
    app.post("/client/account/customization", async (request, reply) => {
        await ClientController.clientAccountCustomization(request, reply);
    });


    // Client Handbook Routes //
    app.post("/client/handbook/templates", async (_request, reply) => {
        const { database } = require("../app");
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
        const { database } = require("../app");
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
        await LocationController.clientLocationGetLocalloot(request, reply);
    });


}

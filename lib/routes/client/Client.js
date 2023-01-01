const { ClientController, MenuController } = require("../../controllers");
const { Trader } = require("../../models/Trader");
const { Response, logger, getCurrentTimestamp } = require("../../utilities");
const { database: { core: { gameplay: {
    trading: { refreshTimeInMinutes } },
    serverConfig: { ip, port } } } } = require("../../../app");


module.exports = async function clientRoutes(app, _opts) {

    app.post(`/client/customization`, async (_request, reply) => {
        await ClientController.clientCustomization(reply);
    });

    app.post(`/client/items`, async (_request, reply) => {
        await ClientController.clientItems(reply);
    });

    app.post(`/client/items/prices/:trader`, async (request, reply) => {
        const { database: { templates: { priceTable } } } = require(`../../../app`);

        const trader = await Trader.get(request.params.trader);
        const currentTime = await getCurrentTimestamp();


        let resupplyTime;
        if (trader.assort.nextResupply !== 0) {
            if (trader.assort.nextResupply <= currentTime) {
                await trader.generateAssort(currentTime);
                resupplyTime = currentTime + refreshTimeInMinutes * 60;
            } else {
                resupplyTime = trader.assort.nextResupply;
            }
        }
        else {
            const resupply = currentTime + refreshTimeInMinutes * 60;
            resupplyTime = resupply
            trader.assort.nextResupply = resupply;
        }

        const prices = {
            supplyNextTime: resupplyTime,
            prices: priceTable,
            currencyCourses: {
                "5449016a4bdc2d6f028b456f": 1,
                "569668774bdc2da2298b4568": 116,
                "5696686a4bdc2da3298b456a": 111
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(prices)
        );
    });

    app.post(`/client/languages`, async (_request, reply) => {
        await ClientController.clientLanguages(reply);
    });

    app.post(`/client/globals`, async (_request, reply) => {
        await ClientController.clientGlobals(reply);
    });

    app.post(`/client/settings`, async (_request, reply) => {
        await ClientController.clientSettings(reply);
    });

    app.post(`/client/weather`, async (_request, reply) => {
        await ClientController.clientWeather(reply);
    });

    app.post(`/client/locations`, async (_request, reply) => {
        await ClientController.clientLocations(reply);
    });

    app.post(`/client/checkVersion`, async (request, reply) => {
        const version = await Response.getVersion(request);
        await logger.info(`EFT Client Version ${version} connected!`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    isValid: true,
                    latestVersion: version
                }
            )
        );
    });

    app.post(`/client/chatServer/list`, async (request, reply) => {
        await logger.info(`[CHAT SERVER OPTIONS] not implemented`);
    });

    app.post(`/client/server/list`, async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody([{ ip: ip, port: port }]));
    });

    app.post(`/client/menu/locale/:language`, async (request, reply) => {
        await MenuController.clientMenuLocale(request, reply);
    });

    app.post(`/client/locale/:language`, async (request, reply) => {
        await ClientController.clientLocale(request, reply);
    });

};

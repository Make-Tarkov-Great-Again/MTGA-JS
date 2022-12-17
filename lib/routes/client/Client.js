const { ClientController, MenuController } = require("../../controllers");
const { Response, logger } = require("../../utilities");
const { database: { core: { serverConfig: { ip, port } } } } = require("../../../app");


module.exports = async function clientRoutes(app, _opts) {

    app.post(`/client/customization`, async (request, reply) => {
        await ClientController.clientCustomization(reply);
    });

    app.post(`/client/items`, async (request, reply) => {
        await ClientController.clientItems(reply);
    });

    app.post(`/client/items/prices`, async (request, reply) => {
        const { database: { templates: { priceTable } } } = require(`../../../app`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(priceTable)
        );
    })

    app.post(`/client/languages`, async (request, reply) => {
        await ClientController.clientLanguages(reply);
    });

    app.post(`/client/globals`, async (request, reply) => {
        await ClientController.clientGlobals(reply);
    });

    app.post(`/client/settings`, async (request, reply) => {
        await ClientController.clientSettings(reply);
    });

    app.post(`/client/weather`, async (request, reply) => {
        await ClientController.clientWeather(reply);
    });

    app.post(`/client/locations`, async (request, reply) => {
        await ClientController.clientLocations(reply);
    });

    app.post(`/client/checkVersion`, async (request, reply) => {
        const version = await Response.getVersion(request);
        await logger.info(`EFT Client Version ${version} connected!`)
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
        await logger.info(`[CHAT SERVER OPTIONS] not implemented`)
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

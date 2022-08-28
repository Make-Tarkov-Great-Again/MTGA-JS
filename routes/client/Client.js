const { ClientController, MenuController } = require("../../lib/controllers");
const { FastifyResponse } = require("../../utilities");

module.exports = async function clientRoutes(app, _opts) {

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

    app.post(`/client/checkVersion`, async (request, reply) => {
        const version = await FastifyResponse.getVersion(request);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({ isValid: true, latestVersion: version })
        );
    });

    app.post(`/client/server/list`, async (_request, reply) => {
        const { database: { core: { serverConfig: { ip, port } } } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([{ ip: ip, port: port }]));
    });

    app.post(`/client/menu/locale/:language`, async (request, reply) => {
        await MenuController.clientMenuLocale(request, reply);
    });

    app.post(`/client/locale/:language`, async (request, reply) => {
        await ClientController.clientLocale(request, reply);
    });

};

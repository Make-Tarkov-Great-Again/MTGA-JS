import { ClientController, MenuController, TraderController } from "../../controllers/_index.mjs";
import { logger } from "../../utilities/_index.mjs";

export default async function clientRoutes(app, _opts) {

    app.post("/client/account/customization", async (request, reply) => {
        await ClientController.clientAccountCustomization(reply);
    });

    app.post(`/client/customization`, async (_request, reply) => {
        await ClientController.clientCustomization(reply);
    });

    app.post(`/client/items`, async (_request, reply) => {
        await ClientController.clientItems(reply);
    });

    app.post(`/client/items/prices/:trader`, async (request, reply) => {
        await TraderController.clientItemPrices(request, reply);
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
        await ClientController.checkVersion(request, reply);
    });

    app.post(`/client/chatServer/list`, async (request, reply) => {
        logger.warn(`[CHAT SERVER OPTIONS] not implemented`);
    });

    app.post(`/client/server/list`, async (_request, reply) => {
        await ClientController.getServerList(reply);
    });

    app.post(`/client/menu/locale/:language`, async (request, reply) => {
        await MenuController.clientMenuLocale(request, reply);
    });

    app.post(`/client/locale/:language`, async (request, reply) => {
        await ClientController.clientLocale(request, reply);
    });

};

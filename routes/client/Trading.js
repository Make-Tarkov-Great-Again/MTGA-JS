const { TraderController } = require("../../lib/controllers");

module.exports = async function tradingRoutes(app, _opts) {

    app.post(`/client/trading/api/getTradersList`, async (request, reply) => {
        await TraderController.clientTradingApiGetTradersInfo(request, reply);
    });

    app.post(`/client/trading/api/traderSettings`, async (request, reply) => {
        await TraderController.clientTradingApiGetTradersInfo(request, reply);
    });

    app.post(`/client/trading/customization/storage`, async (request, reply) => {
        await TraderController.clientTradingCustomizationStorage(request, reply);
    });

    app.post(`/client/trading/customization/:id/offers`, async (request, reply) => {
        await TraderController.getTraderOutfitOffers(request, reply);
    });

    app.post(`/client/trading/api/getTraderAssort/:traderId`, async (request, reply) => {
        await TraderController.getTraderAssort(request, reply);
    });

    app.post(`/client/trading/api/getUserAssortPrice/trader/:traderId`, async (request, reply) => {
        await TraderController.getUserAssortPrice(request, reply);
    });

};

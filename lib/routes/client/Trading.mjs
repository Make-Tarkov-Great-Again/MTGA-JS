import { TraderController, RagfairController, RichPresenseController } from "../../controllers/_index.mjs";
import { Response } from "../../utilities/_index.mjs";

export default async function tradingRoutes(app, _opts) {

    app.post(`/client/trading/api/traderSettings`, async (request, reply) => {
        await TraderController.clientTradingApiGetTradersInfo(reply);
    });

    app.post(`/client/trading/customization/storage`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await TraderController.clientTradingCustomizationStorage(sessionID, reply);
    });

    app.post(`/client/trading/customization/:id/offers`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await RichPresenseController.OnTraderMenuServices(sessionID, request.params.id);
        await TraderController.getTraderOutfitOffers(request, reply);
    });

    app.post(`/client/trading/api/getTraderAssort/:traderId`, async (request, reply) => { 
        const sessionID = await Response.getSessionID(request);
        const traderID = request.params.traderId;
        await RichPresenseController.OnTraderMenu(sessionID, traderID); 
        await TraderController.getTraderAssort(sessionID, traderID, reply);
    });

    app.post(`/client/trading/api/getUserAssortPrice/trader/:traderId`, async (request, reply) => {
        await TraderController.getUserAssortPrice(request, reply);
    });

    app.post(`/client/ragfair/find`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        await RichPresenseController.OnFleaMarket(sessionID);
        await RagfairController.clientRagfairFind(sessionID, request, reply);
    });

    app.post(`/client/ragfair/itemMarketPrice`, async (request, reply) => {
        await RagfairController.clientRagfairItemMarketPrice(request, reply);
    })

    app.post(`/client/ragfair/offer/findbyid`, async (request, reply) => {
        await RagfairController.clientRagfairOfferFindById(request, reply);
    })

    app.post(`/client/reports/ragfair/send`, async (request, reply) => {
        await RagfairController.clientReportsRagfairSend(request, reply);
    })

};

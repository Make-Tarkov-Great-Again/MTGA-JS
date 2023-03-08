import { Ragfair, Profile } from "../classes/_index.mjs";
import { Response, logger } from "../utilities/_index.mjs";


export class RagfairController {

    static async clientRagfairFind(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const playerProfile = Profile.get(sessionID);
        const offers = await Ragfair.generateOffersBasedOnRequest(request, playerProfile);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(offers)
        );
    }

    static async clientRagfairItemMarketPrice(request, reply) {
        /**
        * Called when creating an offer on flea, fills values in top right corner
        */
        logger.warn(`/client/ragfair/itemMarketPrice not implemented`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("object")
        );
    }

    static async clientRagfairOfferFindById(request, reply) {
        logger.warn(`/client/ragfair/offer/findbyid not implemented`);
    }

    static async clientReportsRagfairSend(request, reply) {
        logger.warn(`/client/reports/ragfair/send not implemented`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("null")
        );
    }

}
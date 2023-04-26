import { Ragfair, Profile, Response } from "../classes/_index.mjs";
import { logger } from "../utilities/_index.mjs";

export class RagfairController {

    static async clientRagfairFind(sessionID, request, reply) {
        const playerProfile = Profile.get(sessionID);
        const offers = await Ragfair.generateOffersBasedOnRequest(request, playerProfile);

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(offers),
        );
    }

    static async clientRagfairItemMarketPrice(_request, reply) {
        /**
        * Called when creating an offer on flea, fills values in top right corner
        */
        logger.warn(`/client/ragfair/itemMarketPrice not implemented`);
        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("object")
        );
    }

    static async clientRagfairOfferFindById(_request, _reply) {
        logger.warn(`/client/ragfair/offer/findbyid not implemented`);
    }

    static async clientReportsRagfairSend(_request, reply) {
        logger.warn(`/client/reports/ragfair/send not implemented`);
        return Response.zlibJsonReply(
            reply,
            Response.applyEmpty("null")
        );
    }

}
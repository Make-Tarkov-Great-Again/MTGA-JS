import { Ragfair, Profile } from "../classes/_index.mjs";
import { zlibJsonReply, applyBody, applyEmpty, logger } from "../utilities/_index.mjs";
import { RichPresenseController } from "./_index.mjs";


export class RagfairController {

    static async clientRagfairFind(sessionID, request, reply) {
        const playerProfile = Profile.get(sessionID);
        const offers = await Ragfair.generateOffersBasedOnRequest(request, playerProfile);

        return zlibJsonReply(
            reply,
            await applyBody(offers),
        );
    }

    static async clientRagfairItemMarketPrice(_request, reply) {
        /**
        * Called when creating an offer on flea, fills values in top right corner
        */
        logger.warn(`/client/ragfair/itemMarketPrice not implemented`);
        return zlibJsonReply(
            reply,
            await applyEmpty("object")
        );
    }

    static async clientRagfairOfferFindById(_request, _reply) {
        logger.warn(`/client/ragfair/offer/findbyid not implemented`);
    }

    static async clientReportsRagfairSend(_request, reply) {
        logger.warn(`/client/reports/ragfair/send not implemented`);
        return zlibJsonReply(
            reply,
            await applyEmpty("null")
        );
    }

}
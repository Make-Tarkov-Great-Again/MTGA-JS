const { database } = require("../../app");
const { Ragfair } = require("../../lib/models/Ragfair");
const { FastifyResponse } = require("../../utilities");
const { logger } = require("../../utilities");


module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/ragfair/find`, async (request, reply) => {
        logger.logConsole("[ragfair/find]: " + request.body);
        const ragfair = await Ragfair.get("FleaMarket");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await ragfair.generateOffersBasedOnRequest(request.body))
        );
    });

};

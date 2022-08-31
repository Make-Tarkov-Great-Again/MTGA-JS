const { Ragfair } = require("../../lib/models/Ragfair");
const { FastifyResponse, logger, stringify } = require("../../utilities");


module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/ragfair/find`, async (request, reply) => {
        //logger.console("[ragfair/find]: " + stringify(request.body));
        const ragfair = await Ragfair.get("FleaMarket");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await ragfair.generateOffersBasedOnRequest(request.body))
        );
    });

};

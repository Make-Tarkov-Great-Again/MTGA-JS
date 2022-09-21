const { Ragfair } = require("../../lib/models/Ragfair");
const { Response, logger, stringify } = require("../../utilities");


module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/ragfair/find`, async (request, reply) => {
        const ragfair = await Ragfair.get("FleaMarket");
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(await ragfair.generateOffersBasedOnRequest(request.body))
        );
    });

};

const { database } = require("../../app");
const { FastifyResponse } = require("../../utilities");
const { logger } = require("../../utilities");


module.exports = async function ragfairRoutes(app, _opts) {

    app.post(`/client/ragfair/find`, async (request, reply) => {
        logger.logConsole("[ragfair/find]: " + request.body);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await database.ragfair.generateOffersBasedOnRequest(request.body))
        );
    });
    
};

const { logger, FastifyResponse, writeFile, stringify } = require("../utilities");

module.exports = async function serverRoutes(app, _opts) {

    app.post(`/raid/profile/save`, async (request, reply) => {

        writeFile("./saveInformation.json", stringify(request.body));
        logger.logDebug("/raid/profile/save not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            null
        );
    });

}
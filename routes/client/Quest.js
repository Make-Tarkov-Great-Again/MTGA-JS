const { ClientController } = require("../../lib/controllers");

const { logger, FastifyResponse } = require("../../utilities");

module.exports = async function questRoutes(app, _opts) {

    app.post(`/client/quest/list`, async (request, reply) => {
        await ClientController.clientQuestList(request, reply);
    });

    app.post(`/client/repeatalbeQuests/activityPeriods`, async (request, reply) => {
        console.log(request.body);
        logger.logWarning("RepeatalbeQuests are not implemented yet");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([]));
    });

};

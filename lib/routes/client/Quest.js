const { ClientController, TaskerController } = require("../../controllers");
const { logger, Response } = require("../../utilities");

module.exports = async function questRoutes(app, _opts) {

    app.post(`/client/quest/list`, async (request, reply) => {
        await ClientController.clientQuestList(request, reply);
    });

    app.post(`/client/repeatalbeQuests/activityPeriods`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);

        // last route to be called, will call tasks here to have them created;
        await TaskerController.runTasks(sessionID);


        await logger.warn("[repeatalbeQuests/activityPeriods (NOT IMPLEMENTED)]");
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody([]));
    });

};

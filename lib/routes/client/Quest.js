const { ClientController, TaskerController } = require("../../controllers");
const { logger, Response } = require("../../utilities");
const Profile = require("./Profile");

module.exports = async function questRoutes(app, _opts) {

    app.post(`/client/quest/list`, async (request, reply) => {
        await ClientController.clientQuestList(await Response.getSessionID(request), reply);
    });

    app.post(`/client/repeatalbeQuests/activityPeriods`, async (request, reply) => {
        const { database: { core: { gameplay: { quests: { repeatable:
            { Daily, Weekly }
        } } } } } = require("../../../app");
        const sessionID = await Response.getSessionID(request);
        const { character } = await Profile.get(sessionID);

        const string = character.info.level >= Daily.requiredLevel
            ? character.info.level >= Weekly.requiredLevel
                ? "Both"
                : "Daily"
            : "None"

        // last route to be called, will call tasks here to have them created;
        await TaskerController.runTasks(sessionID);
        if (string === "None") {
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody([]));
        } else {
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody([]));
        }
    });

};

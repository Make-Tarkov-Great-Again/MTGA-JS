const { ClientController, TaskerController } = require("../../controllers");
const { logger, Response, createLink } = require("../../utilities");
const { Profile } = require("../../models/Profile");
const { RepeatableQuest } = require("../../models/RepeatableQuest");

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

        const string = character.Info.Level >= Daily.requiredLevel
            ? character.Info.Level >= Weekly.requiredLevel
                ? "Both"
                : "Daily"
            : "None"

        switch (string) {
            case "None":
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody([]));
            case "Both":
            case "Daily":
                const repeatables = []; //await RepeatableQuest.checkForAvailableQuests(string);
                Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(repeatables));
            default:

                const text = `#bug-reports`;
                const url = `https://discord.com/channels/981198910804615250/1019747705385402403`;
                const linkTo = await createLink(text, url);

                await logger.error(`[/client/repeatalbeQuests/activityPeriods] string did not populate, report to ${linkTo} channel`);
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody([]));
        }
    });

};

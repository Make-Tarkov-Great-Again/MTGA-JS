import { ClientController } from "../../controllers/_index.mjs";
import { logger, zlibJsonReply, applyBody, getSessionID, createLink } from "../../utilities/_index.mjs";
/* const { Profile } = require("../../models/Profile");
const { RepeatableQuest } = require("../../models/RepeatableQuest");
 */
export default async function questRoutes(app, _opts) {

    app.post(`/client/quest/list`, async (request, reply) => {
        await ClientController.clientQuestList(await getSessionID(request), reply);
    });

    app.post(`/client/repeatalbeQuests/activityPeriods`, async (request, reply) => {


        return zlibJsonReply(
            reply,
            await applyBody([]));



        const { database: { core: { gameplay: { quests: { repeatable:
            { Daily, Weekly }
        } } } } } = require("../../../app.mjs");
        const sessionID = await getSessionID(request);
        const { character } = await Profile.get(sessionID);

        const string = character.Info.Level >= Daily.requiredLevel
            ? character.Info.Level >= Weekly.requiredLevel
                ? "Both"
                : "Daily"
            : "None"

        switch (string) {
            case "None":
                return zlibJsonReply(
                    reply,
                    await applyBody([]));
            case "Both":
            case "Daily":
                logger.warn("You are at the proper level, we just haven't implemented Repeatable Quests! :)")
                const repeatables = []; //await RepeatableQuest.checkForAvailableQuests(string);
                return zlibJsonReply(
                    reply,
                    await applyBody(repeatables));
            default:

                const text = `#bug-reports`;
                const url = `https://discord.com/channels/981198910804615250/1019747705385402403`;
                const linkTo = await createLink(text, url);

                logger.error(`[/client/repeatalbeQuests/activityPeriods] string did not populate, report to ${linkTo} channel`);
                return zlibJsonReply(
                    reply,
                    await applyBody([]));
        }
    });

};

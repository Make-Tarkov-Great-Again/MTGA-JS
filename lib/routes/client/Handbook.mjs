import { zlibJsonReply, applyBody, getSessionID } from "../../utilities/_index.mjs";
import { Storage, Templates } from "../../classes/_index.mjs";

export default async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        return zlibJsonReply(
            reply,
            await applyBody(await Templates.getHandbook()));
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const sessionID = await getSessionID(request);
        const builds = Object.values(await Storage.getBuilds(sessionID));
        return zlibJsonReply(
            reply,
            await applyBody(builds)
        );
    });
};

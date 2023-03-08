import { Response } from "../../utilities/_index.mjs";
import { Storage, Templates } from "../../classes/_index.mjs";

export default async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(await Templates.getHandbook()));
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const sessionID = await Response.getSessionID(request);
        const builds = Object.values(await Storage.getBuilds(sessionID));
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(builds)
        );
    });
};

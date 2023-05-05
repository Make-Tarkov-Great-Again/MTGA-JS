import { Storage, Templates, Response } from "../../classes/_index.mjs";

export default async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(Templates.getHandbook())
        );
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const sessionID = Response.getSessionID(request);
        const builds = Object.values(Storage.getBuilds(sessionID));
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(builds)
        );
    });
};

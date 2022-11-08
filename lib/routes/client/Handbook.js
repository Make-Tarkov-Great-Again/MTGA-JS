const { Response } = require("../../utilities");
const { Profile } = require("../../models/Profile");

module.exports = async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        const { database: { templates } } = require("../../../app");
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(templates));
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const profile = await Profile.get(await Response.getSessionID(request));
        const builds = await profile.getStorageBuilds();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(Object.values(builds))
        );
    });
};

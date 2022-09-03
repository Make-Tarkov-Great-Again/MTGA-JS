const { FastifyResponse } = require("../../utilities");
const { Profile } = require("../../lib/models/Profile");

module.exports = async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        const { database: { templates } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(templates));
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const profile = await Profile.get(await FastifyResponse.getSessionID(request));
        const builds = await profile.getStorageBuilds();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(Object.values(builds))
        );
    });
};

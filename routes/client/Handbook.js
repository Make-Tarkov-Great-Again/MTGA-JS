const { FastifyResponse } = require("../../utilities");
const { Account } = require("../../lib/models/Account");

module.exports = async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        const { database: { templates } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(templates));
    });

    app.post(`/client/handbook/builds/my/list`, async (request, reply) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const builds = await profile.getStorageBuilds();
        if (!builds || Object.keys(builds).length === 0) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody([]));
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(Object.values(builds)));
    });
};

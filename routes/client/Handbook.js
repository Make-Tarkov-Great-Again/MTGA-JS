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
        const storageData = await profile.getStorage()

        const builds = [];
        for (const identifier of Object.keys(storageData.builds)) {
            builds.push(storageData.builds[identifier]);
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(builds));
    });

};

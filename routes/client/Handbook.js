const { Weaponbuild } = require('../../lib/models/Weaponbuild');
const { FastifyResponse } = require("../../utilities");

module.exports = async function handbookRoutes(app, _opts) {

    app.post("/client/handbook/templates", async (_request, reply) => {
        const { database: { templates } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(templates));
    });

    app.post(`/client/handbook/builds/my/list`, async (_request, reply) => {
        const output = await Weaponbuild.getAllWithoutKeys();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output));
    });

};

const { stringify } = require("../utilities");

module.exports = async function serverRoutes(app, _opts) {

    app.get(`/server/config/server`, async (_request, reply) => {
        const { database: { core: { serverConfig } } } = require("../app");
        return Response.zlibJsonReply(reply, serverConfig);
    });

}
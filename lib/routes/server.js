const { database: { core: { serverConfig } } } = require("../app");

module.exports = async function serverRoutes(app, _opts) {

    app.get(`/server/config/server`, async (_request, reply) => {
        return Response.zlibJsonReply(reply, serverConfig);
    });

}
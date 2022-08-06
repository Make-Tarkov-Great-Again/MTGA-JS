const { logger, FastifyResponse } = require("../utilities");

module.exports = async function serverRoutes(app, _opts) {
    app.get(`/server/config/server`, async (_request, reply) => {
        const { database } = require("../app");
        await FastifyResponse.zlibJsonReply(
            reply,
            database.core.serverConfig
        );
    });
}
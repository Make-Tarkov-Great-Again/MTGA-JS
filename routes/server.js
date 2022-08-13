const { logger, FastifyResponse, stringify } = require("../utilities");

module.exports = async function serverRoutes(app, _opts) {

    app.get(`/server/config/server`, async (_request, _reply) => {
        const { database } = require("../app");
        return stringify(database.core.serverConfig);
    });

}
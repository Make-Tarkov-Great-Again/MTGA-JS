const { logger, FastifyResponse } = require("../utilities");


module.exports = async function sitRoutes(app, _opts) {
  app.post(`/client/sit-validator`, async (_request, reply) => {
    await FastifyResponse.zlibJsonReply(
      reply,
      true
    );
  });

  app.get(`/server/config/server`, async (_request, reply) => {
    const { database } = require("../app");
    await FastifyResponse.zlibJsonReply(
      reply,
      database.core.serverConfig
    );
  });
}

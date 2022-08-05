 const { logger, FastifyResponse } = require("../utilities");
 const {database} = require ("../app");

 module.exports = async function sitRoutes(app, _opts) {
   //[Slejm] Post or Get? probably POST
   app.post(`/client/sit-validator`, async (_request, reply) => {
    await FastifyResponse.zlibJsonReply(
        reply,
        true
    );
  })
   app.get(`/server/config/server`, async (_request, reply) => {
      await FastifyResponse.zlibJsonReply(
      reply,
      database.core.serverConfig
    );
  })
}

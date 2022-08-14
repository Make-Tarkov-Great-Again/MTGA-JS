const { logger, FastifyResponse } = require("../utilities");

module.exports = async function sitRoutes(app, _opts) {

  app.post(`/client/sit-validator`, async (_request, reply) => {
    return FastifyResponse.zlibJsonReply(reply, true);
  });

}

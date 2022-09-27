const { BundlesController } = require("../lib/controllers");
const { logger } = require("../utilities");


module.exports = async function bundlesRoutes(app, _opts) {

  app.get(`/getBundleList`, async (request, reply) => {
    logger.warn("Bundles not implemented yet")
    await BundlesController.getBundles(reply);
  });

  app.get(`/ServerInternalIPAddress`, async (request, reply) => {
    const { database: { core: { serverConfig: { ip } } } } = require("../app");
    return Response.zlibJsonReply(reply, ip)
  });

  app.get(`/ServerExternalIPAddress`, async (request, reply) => {
    const { database: { core: { serverConfig: { ip_backend } } } } = require("../app");
    return Response.zlibJsonReply(reply, ip_backend);
  });

}
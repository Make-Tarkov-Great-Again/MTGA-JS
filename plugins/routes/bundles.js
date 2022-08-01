/**
 * GET:/getBundleList
 */
const { BundlesController } = require("../controllers/client");
const { logger } = require("../utilities");


module.exports = async function bundlesRoutes(app, _opts) {
  logger.logWarning("Bundles not implemented yet")
  app.get(`/getBundleList`, async (_request, reply) => {
    await BundlesController.getBundles(reply);
  })
}
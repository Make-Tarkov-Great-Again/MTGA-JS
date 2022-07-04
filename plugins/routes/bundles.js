/**
 * GET:/getBundleList
 */
const { BundlesController } = require("../controllers");
const { logger } = require("../utilities");


module.exports = async function singleplayerBundles(app, opts) {
  logger.logWarning("Bundles not implemented yet")
  app.get(`/getBundleList`, async (_request, _reply) => {
    await BundlesController.getBundles();
  })
}
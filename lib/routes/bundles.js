const { BundlesController } = require("../controllers");
const { logger } = require("../utilities");


module.exports = async function bundlesRoutes(app, _opts) {

  app.get(`/getBundleList`, async (_request, reply) => {
    logger.warn("Custom Bundle loading is not implemented! :)")
    await BundlesController.getBundles(reply);
  });

}
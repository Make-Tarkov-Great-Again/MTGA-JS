/**
 * GET:/getBundleList
 */
const { BundlesController } = require("../controllers/client");


module.exports = async function singleplayerBundles(app, opts) {
  app.get(`/getBundleList`, async (_request, _reply) => {
    await BundlesController.getBundles();
  })
}
/**
 * GET:/singleplayer/bundles
 */
const { BundlesController } = require("../controllers/client");


module.exports = async function singleplayerBundles(app, opts) {
  app.get(`/singleplayer/bundles`, async (_request, _reply) => {
    await BundlesController.getBundles();
  })
}
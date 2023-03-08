import { BundlesController } from "../controllers/_index.mjs";
import { logger } from "../utilities/_index.mjs";


export default async function bundlesRoutes(app, _opts) {

  app.get(`/getBundleList`, async (_request, reply) => {
    logger.warn("Custom Bundle loading is not implemented! :)")
    await BundlesController.getBundles(reply);
  });

}
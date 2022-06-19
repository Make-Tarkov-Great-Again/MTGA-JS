'use strict'
const { launcherRoutes } = require(`./controllers/routes/launcher`);
const { weblauncherRoutes } = require(`./controllers/routes/weblauncher`);

/**
 * coreRoutes list
 */
let coreRoutes = {};
module.exports.coreRoutes = coreRoutes;

/**
 * Adds routes to the coreRoutes object
 */
function impregnateCoreRoutes() {
    for (const route in launcherRoutes) {
        coreRoutes[route] = launcherRoutes[route];
    }

    for (const route in weblauncherRoutes) {
        coreRoutes[route] = weblauncherRoutes[route];
    }
}
impregnateCoreRoutes();
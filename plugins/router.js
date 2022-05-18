'use strict'
//const { default: fastifyCompress } = require("@fastify/compress");
const { launcherRoutes } = require(`./routes/routers/launcher`);

const testRoutes = [
    {
        url: '/',
        action: async (url, info, sessionID) => {
            return `/ is working`;
        }
    },
    {
        url: '/launcher',
        action: async (url, info, sessionID) => {
            return `/launcher is working`;
        }
    }
]
module.exports.testRoutes = testRoutes;
/**
 * coreRoutes list
 */
let coreRoutes = {};
module.exports.coreRoutes = coreRoutes;

/**
 * Adds routes to the coreRoutes object
 */
async function impregnateCoreRoutes() {
   for (const route in launcherRoutes) {
       coreRoutes[route] = launcherRoutes[route];
   }
}
impregnateCoreRoutes();

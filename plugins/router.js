'use strict'
const { logger } = require("../app");
const { launcherRoutes } = require(`./routes/routers/launcher`);
const { noBody } = require(`./utilities/response`);


const testRoutes = [

    /**
     * request.url: url
     * request.body: info
     */
    {
        url: '/',
        action: async (url, info, sessionID) => {
            const email = !info.email ? "Failed" : info.email;
            const password = !info.password ? "Failed" : info.password;
            const edition = !info.edition ? "Failed" : info.edition;

            const output = email + " / " + password + " / " + edition;

            return output;
        }
    },
    {
        url: '/launcher',
        action: async (url, info, sessionID) => {
            const output = "That's pretty cool faggot."
            return noBody(output);
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

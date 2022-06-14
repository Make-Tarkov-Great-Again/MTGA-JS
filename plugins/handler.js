'use strict'

const { app, response, logger } = require(`./../app`);
const {
    respondBundle,
    respondImage,
    //respondNotify,
    respondKillResponse
} = response;
const { coreRoutes } = require(`./router`);

async function routeHandle(request, reply, Route) {

    const sessionID = request.cookies != undefined &&
        request.cookies["PHPSESSID"] !== undefined ?
        request.cookies["PHPSESSID"] : undefined;


    let isCallback = false;
    const routedData = await Route(request.url, request.body, sessionID);
    logger.logDebug(`[REQUEST URL]: `, request.url);


    if (routedData != null && routedData != undefined) {
        const responseCallbacks = await getRespondCallbacks();
        for (const callback in responseCallbacks) {
            if (callback === routedData) {
                responseCallbacks[callback](sessionID, request, reply, routedData);
                isCallback = true;
            }
        }
        if (!isCallback) {
            reply.compress(routedData)
        }
    }
    else {
        return logger.logDebug(`Altered Tarkov API is working`);
    }
}
module.exports = routeHandle;

//this should too
for (const route in coreRoutes) {
    app.all(route, async (request, reply) => {
        logger.logDebug(`[Core ROUTER]: ${route}`);
        return routeHandle(request, reply, coreRoutes[route]);
    })
}

/**
 * call a bunch of dumbass code maybe
 * @returns 
 */
async function getRespondCallbacks() {

    return {
        "BUNDLE": respondBundle,
        "IMAGE": respondImage,
        "DONE": respondKillResponse
    }
}
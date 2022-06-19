'use strict'

const { app, response, logger } = require(`./../app`);
const {
    respondBundle,
    respondImage,
    //respondNotify,
    respondKillResponse
} = response;
const { coreRoutes } = require(`./router`);
const { parseAcceptHeaders } = require(`./utilities/response`);

async function routeHandle(request, reply, Route) {
    if(request.headers != undefined && request.headers["accept"] != undefined && request.headers["accept"] != null) {
        reply.header('Content-Type', parseAcceptHeaders(request.headers.accept));
    }

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
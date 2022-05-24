'use strict'

const { app, response, logger } = require(`./../app`);
const {
    respondBundle,
    respondImage,
    respondNotify,
    respondKillResponse
} = response;
const { testRoutes, coreRoutes } = require(`./router`);
const fs = require('fs');


async function routeHandle(request, reply, Route) {

    console.log(`[REQUEST URL]: `, request.url);
    console.log(`[REQUEST BODY]: `, request.body);
    console.log(`[ROUTED METHOD]: `, request.method);

    if (typeof request.url === "undefined") { return; }
    if (typeof request.body === "undefined") {
        console.log(`[REQUEST BODY WAS EMPTY]: `);
    }


    const sessionID = request.cookies != undefined &&
        request.cookies["PHPSESSID"] !== undefined ?
        request.cookies["PHPSESSID"] : undefined;


    let isCallback = false;
    const routedData = await Route(request.url, request.body, sessionID);


    if (routedData != null && routedData != undefined) {
        const responseCallbacks = await getRespondCallbacks();
        for (const callback in responseCallbacks) {
            if (callback === routedData) {
                responseCallbacks[callback](sessionID, request, reply, routedData);
                isCallback = true;
            }
        }
        if (!isCallback) {
            logger.logDebug(`[HANDLE ROUTE]: ${request.url}`);
            reply
                .compress(routedData);
            logger.logDebug(`[HANDLE ROUTE // COMPRESSED]: ${reply.compress(routedData)}`);
        }
    }
    else {
        reply.send("Altered Tarkov API is working")
    }
}
module.exports = routeHandle;

// if this works
for (const route of testRoutes) {
    {
        app.all(route.url, (request, reply) => {
            logger.logInfo(`[Test ROUTER]: ${route.url}`);
            return routeHandle(request, reply, route.action);
        })
    }
}

//this should too
for (const route in coreRoutes) {
    app.get(route, (req, res) => {
        logger.logInfo(`[Core ROUTER]: ${route}`);
        return routeHandle(req, res, coreRoutes[route]);
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
        "NOTIFY": respondNotify,
        "DONE": respondKillResponse
    }
}
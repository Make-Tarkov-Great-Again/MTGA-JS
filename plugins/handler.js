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


async function routeHandle(req, reply, Route) {

    const sessionID = req.cookies != undefined &&
        req.cookies["PHPSESSID"] !== undefined ?
        req.cookies["PHPSESSID"] : undefined;


    let isCallback = false;
    const routedData = await Route(req.url, req.body, sessionID);
    console.log(`[REQUEST URL]: `, req.url);
    console.log(`[REQUEST BODY]: `, req.body);


    if (routedData != null && routedData != undefined) {
        const responseCallbacks = await getRespondCallbacks();
        for (const callback in responseCallbacks) {
            if (callback === routedData) {
                responseCallbacks[callback](sessionID, req, reply, routedData);
                isCallback = true;
            }
        }
        if (!isCallback) {
            logger.logDebug(`[HANDLE ROUTE]: ${req.url}`);
            reply
                .type('application/json', `utf8`)
                .compress(fs.createReadStream(routedData));
            logger.logDebug(`[HANDLE ROUTE // COMPRESSED]: ${routedData}`);
        }
    }
    else {
        return `Altered Tarkov API is working`;
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
    app.all(route, (request, reply) => {
        logger.logInfo(`[Core ROUTER]: ${route}`);
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
        "NOTIFY": respondNotify,
        "DONE": respondKillResponse
    }
}
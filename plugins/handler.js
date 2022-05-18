'use strict'
const {
    respondBundle,
    respondImage,
    respondNotify,
    respondKillResponse
} = require(`./../plugins/utilities/response`);
const { testRoutes, coreRoutes } = require(`./router`);
const fs = require('fs');


async function routeHandle(request, reply, Route) {

    AE.server.log.info(`[request.url] ${request.url}`)
    AE.server.log.info(`[request.body] ${request.body}`)

    const sessionID = request.cookies != undefined &&
        request.cookies["PHPSESSID"] !== undefined ?
        request.cookies["PHPSESSID"] : undefined;

    AE.server.log.info(`Session ID: ${sessionID}`);


    let isCallback = false;
    var routedData = await Route(request.url, request.body, sessionID);

    AE.server.log.info(`[request.url] ${request.url}`)
    AE.server.log.info(`[request.body] ${request.body}`)


    if (routedData != null && routedData != undefined) {
        const responseCallbacks = await getRespondCallbacks();
        for (const callback in responseCallbacks) {
            if (callback === routedData) {
                responseCallbacks[callback](sessionID, request, reply, routedData);
                isCallback = true;
            }
        }
        if (!isCallback) {
            reply
                .header('Content-Type', 'application/json')
                .compress(routedData, function (err, buffer) {
                    reply.end(buffer)
                })
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
        AE.server.all(route.url, (request, reply) => {
            AE.server.log.info(`[ROUTER]: ${route.url}`);
            return routeHandle(request, reply, route.action);
        })
    }
}

//this should too
for (const route in coreRoutes) {
    AE.server.all(route, (request, reply) => {
        AE.server.log.info(`[ROUTER]: ${coreRoutes[route].url}`);
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
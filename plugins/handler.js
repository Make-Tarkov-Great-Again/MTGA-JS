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

    const sessionID = request.cookies != undefined &&
        request.cookies["PHPSESSID"] !== undefined ?
        request.cookies["PHPSESSID"] : undefined;


    let isCallback = false;
    var routedData = await Route(request.url, request.body, sessionID, reply);
    console.log(`[REQUEST URL]: `, request.url);


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
                .type('application/json')
                .compress(routedData)
        }
    }
    else {
        return `Altered Tarkov API is working`;
    }
}
module.exports = routeHandle;

function inflateRequestBody(request, reply, next, done) {

    // console.log(req.body);

    const stringifiedBody =
        typeof (request.body) === "object" ? JSON.stringify(request.body) : null;

    if (stringifiedBody == '{}') {
        done(request.body);
        return;
    }

    let isJson = request.body.toString !== undefined &&
        request.body.toString('utf-8').charAt(0) == "{";

    if (
        (!isJson || (request.headers["content-encoding"] !== undefined && request.headers["content-encoding"] == "deflate")) &&
        ((request.headers["user-agent"] !== undefined && request.headers["user-agent"].includes("Unity")) &&
            request.body["toJSON"] !== undefined)
    ) {

        try {
            reply.decompress(request.body, function (err, result) {

                if (!err && result !== undefined) {

                    var asyncInflatedString = result.toString('utf-8');
                    // console.log(asyncInflatedString);
                    if (asyncInflatedString.length > 0) {
                        request.body = JSON.parse(asyncInflatedString);
                    }
                    end(request.body);

                } else {
                    end(request.body);
                    return;
                }


            });

        } catch (error) {
            // console.error(error);
            request.body = JSON.parse(request.body);
            done(request.body);
            return;

        }
        // console.log("inflating data...");
        // console.log(req.body);

    } else {
        request.body = JSON.parse(request.body.toString('utf-8'));
        done(request.body);
    }

    // done();

}

// if this works
for (const route of testRoutes) {
    {
        app.all(route.url, (request, reply) => {
            logger.logInfo(`[ROUTER]: ${route.url}`);
            return routeHandle(request, reply, route.action);
        })
    }
}

//this should too
for (const route in coreRoutes) {
    app.all(route, (request, reply) => {
        logger.logInfo(`[ROUTER]: ${coreRoutes[route].url}`);
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
'use strict'
const { logger, FastifyResponse, writeFile } = require("../utilities");


module.exports = async function notifierRoutes(app, opt) {
    app.post('/push/notifier/get/', async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        );
    });

    app.post('/push/notifier/getwebsocket/', async (request, reply) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        );
    });
};

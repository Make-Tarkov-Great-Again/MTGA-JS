'use strict'
const { logger, fileExist } = require('../utilities');
const { webinterface } = require('../../app');
const fastJson = require('fast-json-stringify');
const fs = require('fs');

const {
    database: {
        profiles,
        core
    }
} = require('../../app');
const { accountController } = require('../controllers/accountcontroller');
module.exports = async function webinterfaceRoutes(app, opts) {
    app.get(`/`, async (request, reply) => {
        return accountController.home(request, reply);
    })

    app.get(`/files/*`, async (request, reply) => {
        const file = request.params['*'];
        let fileExtension = String(file.split(".").at(-1)).toLowerCase();

        switch (fileExtension) {
            case "css":
                reply.type("text/css")
                break;
        }

        return await webinterface.readFile(file);
    })

    app.get(`/message`, async (request, reply) => {
        await webinterface.checkForSessionID(request);
        reply.type("text/html")
        return await webinterface.displayMessage(request.query.messageHeader, request.query.messageBody);
    })
}
'use strict'
const { logger, fileExist } = require('../utilities');
const { webinterface } = require('../../app');
const fs = require('fs');
const { AccountController } = require('../controllers/AccountController');
const { WeblauncherController } = require('../controllers/WeblauncherController');

const {
    database: {
        profiles,
        core
    }
} = require('../../app');
module.exports = async function webinterfaceRoutes(app, opts) {
    app.get(`/`, async (request, reply) => {
        return AccountController.home(request, reply);
    })

    app.get(`/files/*`, async (request, reply) => {
        const file = request.params['*'];
        let fileExtension = String(file.split(".").at(-1)).toLowerCase();

        switch (fileExtension) {
            case "css":
                reply.type("text/css")
                break;
        }

        return webinterface.readFile(file);
    })

    app.get(`/message`, async (request, reply) => {
        await webinterface.checkForSessionID(request);
        reply.type("text/html")
        return await webinterface.displayMessage(request.query.messageHeader, request.query.messageBody);
    })

    // Account Routes //
    app.get('/webinterface/account/test', async (request, reply) => {
        return AccountController.test(request, reply);
    })

    app.get('/webinterface/account/register', async (request, reply) => {
        return AccountController.create(request, reply);
    })

    app.post('/webinterface/account/register', async (request, reply) => {
        return AccountController.store(request, reply);
    })

    app.get('/webinterface/account/login', async (request, reply) => {
        return AccountController.showLogin(request,reply);
    })

    app.post('/webinterface/account/login', async (request, reply) => {
        return AccountController.login(request,reply);
    })

    app.get('/webinterface/account/settings', async (request, reply) => {
        return AccountController.edit(request,reply);
    })

    app.post('/webinterface/account/settings', async (request, reply) => {
        return AccountController.update(request,reply);
    })

    app.get('/webinterface/account/logout', async (request, reply) => {
        return AccountController.logout(request,reply);
    })

    // Launcher Route //
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        return WeblauncherController.launch(request, reply)
    }) 
}
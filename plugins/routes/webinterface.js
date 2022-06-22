'use strict'
const { logger, fileExist } = require('../utilities');
const { webinterface } = require('../../app');
const fastJson = require('fast-json-stringify');
const fs = require('fs');
const { accountController } = require('../controllers/accountcontroller');
const { weblauncherController } = require('../controllers/weblaunchercontroller');

const {
    database: {
        profiles,
        core
    }
} = require('../../app');
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

    // Account Routes //
    app.get('/webinterface/account/test', async (request, reply) => {
        return await accountController.test(request, reply);
    })

    app.get('/webinterface/account/register', async (request, reply) => {
        return await accountController.create(request, reply);
    })

    app.post('/webinterface/account/register', async (request, reply) => {
        return await accountController.store(request, reply);
    })

    app.get('/webinterface/account/login', async (request, reply) => {
        return await accountController.showLogin(request,reply);
    })

    app.post('/webinterface/account/login', async (request, reply) => {
        return await accountController.login(request,reply);
    })

    app.get('/webinterface/account/settings', async (request, reply) => {
        return await accountController.edit(request,reply);
    })

    app.post('/webinterface/account/settings', async (request, reply) => {
        return await accountController.update(request,reply);
    })

    app.get('/webinterface/account/logout', async (request, reply) => {
        reply.clearCookie('PHPSESSID', { path: '/' })
        reply.redirect('/');
    })

    // Launcher Route //
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        return await weblauncherController.launch(request, reply)
    }) 
}
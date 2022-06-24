'use strict'
const { logger, fileExist } = require('../utilities');
const { webinterface } = require('../../app');
const fs = require('fs');
const { accountController } = require('../controllers/accountController');
const { weblauncherController } = require('../controllers/weblauncherController');

const {
    database: {
        profiles,
        core
    }
} = require('../../app');
module.exports = async function webinterfaceRoutes(app, _opts) {
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

        await webinterface.readFile(file);
    })

    app.get(`/message`, async (request, reply) => {
        await webinterface.checkForSessionID(request);
        reply.type("text/html")
        await webinterface.displayMessage(request.query.messageHeader, request.query.messageBody);
    })

    // Account Routes //
    app.get('/webinterface/account/test', async (request, reply) => {
        await accountController.test(request, reply);
    })

    app.get('/webinterface/account/register', async (request, reply) => {
        await accountController.create(request, reply);
    })

    app.post('/webinterface/account/register', async (request, reply) => {
        await accountController.store(request, reply);
    })

    app.get('/webinterface/account/login', async (request, reply) => {
        await accountController.showLogin(request,reply);
    })

    app.post('/webinterface/account/login', async (request, reply) => {
        await accountController.login(request,reply);
    })

    app.get('/webinterface/account/settings', async (request, reply) => {
        await accountController.edit(request,reply);
    })

    app.post('/webinterface/account/settings', async (request, reply) => {
        await accountController.update(request,reply);
    })

    app.get('/webinterface/account/logout', async (_request, reply) => {
        reply.clearCookie('PHPSESSID', { path: '/' })
        reply.redirect('/');
    })

    // Launcher Route //
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        await weblauncherController.launch(request, reply)
    }) 
}
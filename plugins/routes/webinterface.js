'use strict'
const { logger, fileExist } = require('../utilities');
const webInterfaceController = require('../controllers/webinterfacecontroller');
const fastJson = require('fast-json-stringify');
const fs = require('fs');

const {
    database: {
        profiles,
        core
    }
} = require('../../app');
const { accountController } = require('../controllers/accountcontroller');
const { weblauncherController } = require('../controllers/weblaunchercontroller');


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

        return await webInterfaceController.readFile(file);
    })

    app.get(`/message`, async (request, reply) => {
        await webInterfaceController.checkForSessionID(request);
        reply.type("text/html")
        return await webInterfaceController.displayMessage(request.query.messageHeader, request.query.messageBody);
    })

    // Auth //

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

    app.get('/webinterface/account/logout', async (request, reply) => {
        reply.clearCookie('PHPSESSID', { path: '/' })
        reply.redirect('/');
    })




    

    // Launch //

    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        return await weblauncherController.launch(request, reply)

    }) 
}
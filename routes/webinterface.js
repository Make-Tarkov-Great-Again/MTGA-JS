const { webinterface } = require('../app');
const { AccountController, WeblauncherController } = require('../lib/controllers');

module.exports = async function webinterfaceRoutes(app, _opts) {

    app.get(`/`, async (request, reply) => {
        return AccountController.home(request, reply);
    });

    app.get(`/message`, async (request, reply) => {
        await webinterface.checkForSessionID(request);
        reply.type("text/html");
        return webinterface.displayMessage(request.query.messageHeader, request.query.messageBody);
    });

    // Account Routes //
    app.get('/webinterface/account/test', async (request, reply) => {
        return AccountController.test(request, reply);
    });

    app.get('/webinterface/account/register', async (request, reply) => {
        return AccountController.create(request, reply);
    });

    app.post('/webinterface/account/register', async (request, reply) => {
        return AccountController.store(request, reply);
    });

    app.get('/webinterface/account/login', async (request, reply) => {
        return AccountController.showLogin(request, reply);
    });

    app.post('/webinterface/account/login', async (request, reply) => {
        return AccountController.login(request, reply);
    });

    app.get('/webinterface/account/settings', async (request, reply) => {
        return AccountController.edit(request, reply);
    });

    app.get('/webinterface/account/settings/wipe', async (request, reply) => {
        return AccountController.wipe(request, reply);
    });

    app.post('/webinterface/account/settings', async (request, reply) => {
        return AccountController.update(request, reply);
    });

    app.get('/webinterface/account/logout', async (request, reply) => {
        return AccountController.logout(request, reply);
    });

    // Launcher Route //
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        return WeblauncherController.launch(request, reply);
    });
}

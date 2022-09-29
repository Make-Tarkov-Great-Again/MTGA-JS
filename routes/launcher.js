const { webinterface } = require('../app');
const { AccountController, WeblauncherController } = require('../lib/controllers');

module.exports = async function launcherRoutes(app, _opts) {

    // Account Routes //
    app.get('/launcher/account/test', async (request, reply) => {
        return AccountController.test(request, reply);
    });

    app.get('/launcher/account/register', async (request, reply) => {
        return AccountController.create(request, reply);
    });

    app.post('/launcher/account/register', async (request, reply) => {
        return AccountController.store(request, reply);
    });

    app.get('/launcher/account/login', async (request, reply) => {
        return AccountController.showLogin(request, reply);
    });

    app.post('/launcher/account/login', async (request, reply) => {
        return AccountController.launcherLogin(request, reply);
    });

    app.get('/launcher/account/settings', async (request, reply) => {
        return AccountController.edit(request, reply);
    });

    app.get('/launcher/account/settings/wipe', async (request, reply) => {
        return AccountController.wipe(request, reply);
    });

    app.post('/launcher/account/settings', async (request, reply) => {
        return AccountController.update(request, reply);
    });

    app.get('/launcher/account/logout', async (request, reply) => {
        return AccountController.logout(request, reply);
    });

    // Launcher Route //
    app.get('/launcher/weblauncher/start', async (request, reply) => {
        return WeblauncherController.launch(request, reply);
    });

}

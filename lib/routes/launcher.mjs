import { AccountController, WeblauncherController } from '../controllers/_index.mjs';

export default async function launcherRoutes(app, _opts) {

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
        //DiscordRPC.OnServerLogin //Hopefully to stop it from erroring because playerLevel and playerSide doesnt exist lel -kes
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

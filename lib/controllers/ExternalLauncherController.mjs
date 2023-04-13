import { AccountController, RichPresenseController, WeblauncherController } from '../controllers/_index.mjs';

export default async function launcher1Routes(app, _opts) {

    app.get(`/`, async (request, reply) => {
        const sessionID = launcher1.checkForSessionID(request);
        await RichPresenseController.OnHome(sessionID);
        return AccountController.home(sessionID, reply);
    });

    app.get(`/message`, async (request, reply) => {
        launcher1.checkForSessionID(request);
        reply.type("text/html");
        return launcher1.displayMessage(request.query.messageHeader, request.query.messageBody);
    });

    app.get('/launcher1/account/register', async (request, reply) => {
        return AccountController.create(request, reply);
    });

    app.post('/launcher1/account/register', async (request, reply) => {
        return AccountController.store(request, reply);
    });

    app.get('/launcher1/account/login', async (request, reply) => {
        const sessionID = launcher1.checkForSessionID(request);
        await RichPresenseController.OnLogin(sessionID);
        return AccountController.showLogin(request, reply);
    });

    app.post('/launcher1/account/login', async (request, reply) => {
        return AccountController.login(request, reply);
    });

    app.get('/launcher1/account/settings', async (request, reply) => {
        const sessionID = launcher1.checkForSessionID(request);
        await RichPresenseController.OnSettings(sessionID);
        return AccountController.edit(sessionID, reply);
    });

    app.post('/launcher1/account/settings', async (request, reply) => {
        return AccountController.update(request, reply);
    });

    app.get('/launcher1/account/logout', async (request, reply) => {
        return AccountController.logout(request, reply);
    });

    // Launcher Route //
    app.get('/launcher1/weblauncher/start', async (request, reply) => {
        const sessionID = launcher1.checkForSessionID(request);
        await RichPresenseController.OnGameStart(sessionID);
        return WeblauncherController.launch(sessionID, reply);
    });
    // download client script
    app.get('/launcher1/weblauncher/mtgascripts', async (request, reply) => {

        const sessionID = launcher1.checkForSessionID(request);
        await RichPresenseController.OnGameStart(sessionID);
        return WeblauncherController.download(sessionID, reply);
    });
}

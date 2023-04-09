import { webinterface } from '../../app.mjs';
import { AccountController, RichPresenseController, WeblauncherController } from '../controllers/_index.mjs';

export default async function webinterfaceRoutes(app, _opts) {

    app.get(`/`, async (request, reply) => {
        const sessionID = webinterface.checkForSessionID(request);
        await RichPresenseController.OnHome(sessionID);
        return AccountController.home(sessionID, reply);
    });

    app.get(`/message`, async (request, reply) => {
        webinterface.checkForSessionID(request);
        reply.type("text/html");
        return webinterface.displayMessage(request.query.messageHeader, request.query.messageBody);
    });

    app.get('/webinterface/account/register', async (request, reply) => {
        return AccountController.create(request, reply);
    });

    app.post('/webinterface/account/register', async (request, reply) => {
        return AccountController.store(request, reply);
    });

    app.get('/webinterface/account/login', async (request, reply) => {
        const sessionID = webinterface.checkForSessionID(request);
        await RichPresenseController.OnLogin(sessionID);
        return AccountController.showLogin(request, reply);
    });

    app.post('/webinterface/account/login', async (request, reply) => {
        return AccountController.login(request, reply);
    });

    app.get('/webinterface/account/settings', async (request, reply) => {
        const sessionID = webinterface.checkForSessionID(request);
        await RichPresenseController.OnSettings(sessionID);
        return AccountController.edit(sessionID, reply);
    });

    app.post('/webinterface/account/settings', async (request, reply) => {
        return AccountController.update(request, reply);
    });

    app.get('/webinterface/account/logout', async (request, reply) => {
        return AccountController.logout(request, reply);
    });

    // Launcher Route //
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        const sessionID = webinterface.checkForSessionID(request);
        await RichPresenseController.OnGameStart(sessionID);
        return WeblauncherController.launch(sessionID, reply);
    });
    // download client script
    app.get('/webinterface/weblauncher/mtgascripts', async (request, reply) => {

        const sessionID = webinterface.checkForSessionID(request);
        await RichPresenseController.OnGameStart(sessionID);
        return WeblauncherController.download(sessionID, reply);
    });
}

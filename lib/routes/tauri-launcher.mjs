import { AccountController, WeblauncherController } from '../controllers/_index.mjs';
import { LauncherControllerinator } from '../controllers/ExternalLauncherController.mjs';

export default async function taurilauncherRoutes(app, _opts) {

    // Account Routes //
    app.post('/tauri/account/register', async (request, reply) => {
        return AccountController.tauriRegister(request, reply);
    });
 
    app.get('/tauri/heartbeat', async (request, reply) => {    //unused until i find a way to use this without spamming console lol
        return "alive";
    });

    app.post('/tauri/get/charcter', async (request, reply) => { // Updates info
        return LauncherControllerinator.UpdateProfileDataInLauncher(request, reply);
    });

    app.post('/tauri/account/login', async (request, reply) => {
        return AccountController.tauriLogin(request, reply);
    });
    // TODO: Settings page {
    app.get('/tauri/account/settings', async (request, reply) => {
        return AccountController.edit(request, reply);
    });

    app.get('/tauri/profile/settings/wipe', async (request, reply) => {
        //DiscordRPC.OnServerLogin //Hopefully to stop it from erroring because playerLevel and playerSide doesnt exist lel -kes
        return AccountController.wipe(request, reply);
    });

    app.post('/tauri/profile/settings', async (request, reply) => {
        return AccountController.update(request, reply);
    });
    // }

    // Launcher Route //
    app.post('/tauri/launcher/start', async (request, reply) => {
        return LauncherControllerinator.LaunchGame(request, reply);
    });

}
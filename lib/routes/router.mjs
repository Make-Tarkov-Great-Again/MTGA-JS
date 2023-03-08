import bundlesRoutes from "./bundles.mjs";
//import accountRoutes from "./client/Account.mjs";
import botRoutes from "./client/Bots.mjs";
import clientRoutes from "./client/Client.mjs";
import friendRoutes from "./client/Friend.mjs";
import gameRoutes from "./client/Game.mjs";
import handbookRoutes from "./client/Handbook.mjs";
import hideoutRoutes from "./client/Hideout.mjs";
import insuranceRoutes from "./client/Insurance.mjs";
import locationRoutes from "./client/Location.mjs";
import mailRoutes from "./client/Mail.mjs";
import matchRoutes from "./client/Match.mjs";
import profileRoutes from "./client/Profile.mjs";
import questRoutes from "./client/Quest.mjs";
import raidRoutes from "./client/Raid.mjs";
import tradingRoutes from "./client/Trading.mjs";
import launcherRoutes from "./launcher.mjs";
import notifierRoutes from "./notifier.mjs";
import resourcesRoutes from "./resources.mjs";
import webinterfaceRoutes from "./webinterface.mjs";
import coopRoutes from "./coop.mjs";



export default async function router(app, _opts) {

    await Promise.allSettled([
        /* Register the routes for the client */
        //await app.register(accountRoutes),
        await app.register(botRoutes),
        await app.register(clientRoutes),
        await app.register(friendRoutes),
        await app.register(gameRoutes),
        await app.register(handbookRoutes),
        await app.register(hideoutRoutes),
        await app.register(insuranceRoutes),
        await app.register(locationRoutes),
        await app.register(mailRoutes),
        await app.register(matchRoutes),
        await app.register(profileRoutes),
        await app.register(questRoutes),
        await app.register(raidRoutes),
        await app.register(tradingRoutes),

        /* Register the routes for bundles?????? */
        await app.register(bundlesRoutes),
        /* Register the routes for the launcher */
        await app.register(launcherRoutes),
        /* Register the routes for the tarkov notifier */
        await app.register(notifierRoutes),
        /* Register the routes for files */
        await app.register(resourcesRoutes),
        /* Register the routes for the webinterface */
        await app.register(webinterfaceRoutes),

        await app.register(coopRoutes),

    ])
    /*         .then((results) => results.forEach((result) => console.log(`${result.status}, ${result.reason}`))); */

};

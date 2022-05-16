const { 
    changeProfileEmail, 
    changeProfilePassword, 
    wipeProfile, 
    getProfile, 
    loginProfile, 
    registerProfile, 
    removeProfile,
    connectServer
} = require(`../handlers/launcher`);

/**
 * Is this working?
 * @param {*} app Fastify instance
 * @param {*} opts Fastify options
 * @param {*} done Callback
 */
async function launcherRoutes (app, opts) {

    /**
     * Initialize Router for /launcher/profile/*
     */

    await app.get("/launcher/profile/change/email", changeProfileEmail);

    await app.get("/launcher/profile/change/password", changeProfilePassword);

    await app.get("/launcher/profile/change/wipe", wipeProfile);

    await app.get("/launcher/profile/get", getProfile);

    await app.get("/launcher/profile/login", loginProfile);

    await app.get("/launcher/profile/register", registerProfile);

    await app.get("/launcher/profile/remove", removeProfile);


    /**
     * Initialize Router for /launcher/server/*
     */
     await app.get("/launcher/server/connect", connectServer);
}
module.exports = launcherRoutes;
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

    app.get("/launcher/profile/change/email", changeProfileEmail);

    app.get("/launcher/profile/change/password", changeProfilePassword);

    app.get("/launcher/profile/change/wipe", wipeProfile);

    app.get("/launcher/profile/get", getProfile);

    app.get("/launcher/profile/login", loginProfile);

    app.get("/launcher/profile/register", registerProfile);

    app.get("/launcher/profile/remove", removeProfile);


    /**
     * Initialize Router for /launcher/server/*
     */
    app.get("/launcher/server/connect", connectServer);
}
module.exports = launcherRoutes;
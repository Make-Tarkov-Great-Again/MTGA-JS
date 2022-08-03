module.exports = async function router(app, _opts) {
    /* Register the routes for the webinterface */
    await app.register(require("./webinterface"));

    /* Register the routes for the client */
    await app.register(require("./client/Friend"));
    await app.register(require("./client/Game"));
    await app.register(require("./client/Hideout"));
    await app.register(require("./client/Profile"));
    await app.register(require("./client/Trading"));
    await app.register(require("./client"));
    /* Register the routes for the tarkov notifier */
    await app.register(require("./notifier"));

    /* Register the routes for files */
    await app.register(require("./resources"));

    /* Register the routes for bundles?????? */
    await app.register(require("./bundles"));

    /* Register the routes for SIT */
    await app.register(require("./sit"));
}
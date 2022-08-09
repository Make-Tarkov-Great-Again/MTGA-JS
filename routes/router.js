module.exports = async function router(app, _opts) {
    /* Register the routes for the webinterface */
    await app.register(require("./webinterface"));

    /* Register the routes for the client */
    await app.register(require("./client/Account"));
    await app.register(require("./client/Client"));
    await app.register(require("./client/Friend"));
    await app.register(require("./client/Game"));
    await app.register(require("./client/Handbook"));
    await app.register(require("./client/Hideout"));
    await app.register(require("./client/Location"));
    await app.register(require("./client/Mail"));
    await app.register(require("./client/Match"));
    await app.register(require("./client/Mode"));
    await app.register(require("./client/Profile"));
    await app.register(require("./client/Quest"));
    await app.register(require("./client/Ragfair"));
    await app.register(require("./client/Raid"));
    await app.register(require("./client/Trading"));
    /* Register the routes for the tarkov notifier */
    await app.register(require("./notifier"));

    /* Register the routes for files */
    await app.register(require("./resources"));

    /* Register the routes for bundles?????? */
    await app.register(require("./bundles"));

    /* Register the routes for SIT */
    await app.register(require("./sit"));

    /* Register the routes for the singleplayer */
    await app.register(require("./singleplayer"));
};

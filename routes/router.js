module.exports = async function router(app, _opts) {

    await Promise.allSettled([
        /* Register the routes for the webinterface */
        app.register(require("./webinterface")),

        /* Register the routes for the client */
        app.register(require("./client/Account")),
        app.register(requre("./client/Bots")),
        app.register(require("./client/Client")),
        app.register(require("./client/Friend")),
        app.register(require("./client/Game")),
        app.register(require("./client/Handbook")),
        app.register(require("./client/Hideout")),
        app.register(require("./client/Location")),
        app.register(require("./client/Mail")),
        app.register(require("./client/Match")),
        app.register(require("./client/Profile")),
        app.register(require("./client/Quest")),
        app.register(require("./client/Raid")),
        app.register(require("./client/Trading")),
        app.register(require("./client/Insurance")),
        /* Register the routes for the tarkov notifier */
        app.register(require("./notifier")),

        /* Register the routes for files */
        app.register(require("./resources")),

        /* Register the routes for bundles?????? */
        app.register(require("./bundles"))
    ])
    //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));

};

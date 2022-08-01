module.exports = async function router(app, _opts) {
    /* Register the routes for the webinterface */
    await app.register(require("./routes/webinterface"));

    /* Register the routes for the tarkov web launcher */
    await app.register(require("./routes/client"));

    /* Register the routes for the tarkov notifier */
    await app.register(require("./routes/notifier"));

    /* Register the routes for files */
    await app.register(require("./routes/resources"));

    /* Register the routes for bundles?????? */
    await app.register(require("./routes/bundles"));

    /* Register the routes for SIT */
    await app.register(require("./routes/sit"));
}
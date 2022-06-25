'use strict'


module.exports = async function router(app, opts) {
    //await app.register(require("./routes/launcher"));

    /* Register the routes for the webinterface */
    await app.register(require("./routes/webinterface"));

    /* Register the routes for the tarkov web launcher */
    await app.register(require("./routes/client"));
}
'use strict'


module.exports = async function router (app, opts){
    //await app.register(require("./routes/launcher"));
    
    /* Register the routes for the webinterface */
    await app.register(require("./routes/webinterface"));

    /* Register the routes for the account functionality of the webinterface */
    await app.register(require("./routes/webinterfaceAccount"));

    /* Register the routes for the tarkov web launcher */
    await app.register(require("./routes/webinterfaceLauncher"));
}
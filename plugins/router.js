'use strict'


module.exports = async function router (app, opts){
    await app.register(require("./routes/launcher"));
    await app.register(require("./routes/webinterface"));
}
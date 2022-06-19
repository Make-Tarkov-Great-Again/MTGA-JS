'use strict'
module.exports = async function router (app, opts){
    await app.register(require(`./controllers/routes/launcher`));
}
'use strict'
const launcherRoutes = require(`./routers/launcher`);

async function coreRouter (app, opts) {
    /**
    * Initialize Router
    */
    await app.get('/', async function (request, reply) {
        await reply.send(`/ is working`);
    });

    await app.get('/launcher', async function (request, reply) {
        await reply.send(`/launcher is working`);
    });

    await app.register(launcherRoutes);
}
module.exports = coreRouter
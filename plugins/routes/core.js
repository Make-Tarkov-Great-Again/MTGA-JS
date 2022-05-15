'use strict'
const launcherRoutes = require(`./routers/launcher`);

const coreRouter = (app, opts, done) => {
    /**
    * Initialize Router
    */
    app.get('/', async function (request, reply) {
        reply.send(`/ is working`);
    });

    app.get('/launcher', async function (request, reply) {
        reply.send(`/launcher is working`);
    });

    app.register(launcherRoutes);

    done()
}
module.exports = coreRouter
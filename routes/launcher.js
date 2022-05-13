class LauncherRoutes {
    static initialize(app) {

        /**
         * Working on /launcher route
         */
        app.get("/launcher", (request, reply) => {
            reply.send(`launcher is working`);
        });
    }
}
module.exports = LauncherRoutes;
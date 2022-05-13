const launcher = require('./launcher');

/**
 * Think I need to use Hooks here
 */


class RouteServer {

    static initializeRouting(app) {
        /**
        * Working on a Router for the API
        */
        app.all('*', function (request, reply) {
            //const sessionID = reply.setCookie("PHPSESSID",)

            const urlData = request.urlData();

            switch (urlData.path) {

                case '/':
                    reply.send(`urlData.path / is working`)
                    break;

                case '/launcher':
                    launcher.initialize(app);
                    break;
            }
        });
    }
}
module.exports = RouteServer;
const webinterface = require("./lib/engine/WebInterface");
const database = require('./lib/engine/Database');
const tasker = require('./lib/engine/Tasker');

module.exports = {
    database,
    tasker
};

const Server = require('./lib/engine/Server');

const serverInstance = new Server();

serverInstance.printLogo();

serverInstance.loadPlugins();

serverInstance.loadContentTypeParser();

serverInstance.startServer();

const app = serverInstance.getApp();

module.exports = {
    app,
    database,
    webinterface,
    tasker
};

/* app.removeContentTypeParser("application/json");
app.addContentTypeParser('application/json', function (req, body, done) {
    try {
        zlib.inflate(body, function (err, buffer) {
            if (err && buffer === undefined) {
                err.statusCode = 404;
                logger.error(`Buffer is undefined`);
                done(err, false);
                return;
            }
            const inflatedString = buffer.toString('utf8');
            if (inflatedString.length > 0) {
                const data = parse(inflatedString);
                done(null, data);
                return;
            } else {
                done(null, false);
                return;
            }
        });
    } catch (error) {
        err.statusCode = 404;
        done(err, undefined);
        return;
    }
}); */

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

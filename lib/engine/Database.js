/**
 * Return completed database
 */
const { readParsed, syncGetRandomIntInc } = require("../utilities");
const MongoId = require("mongoid-js").MongoId;


class Database {
    constructor() {
        this.fileAge = {};
        this.core = {
            serverConfig: readParsed(`./assets/database/configs/server.json`),
            botTemplate: readParsed(`./assets/database/configs/schema/botTemplate.json`),
            clientSettings: readParsed(`./assets/database/configs/client.settings.json`).data,
            gameplay: readParsed(`./assets/database/configs/gameplay.json`),
            globals: readParsed(`./assets/database/configs/globals.json`).data,
            locations: readParsed(`./assets/database/configs/locations.json`),
            hideoutSettings: readParsed(`./assets/database/hideout/settings.json`).data,
            blacklist: readParsed(`./assets/database/configs/blacklist.json`),
            metrics: readParsed(`./assets/database/configs/matchMetrics.json`),
            connections: {
                webSocket: {},
                webSocketPings: {}
            },
            mongoIds: new MongoId(syncGetRandomIntInc(1, 16777215))
        };
    };
}
module.exports = new Database();

/**
 * Return completed database
 */
const { readParsedSync, syncGetRandomIntInc, logger } = require("../utilities");
const MongoId = require("mongoid-js").MongoId;


class Database {
    constructor() {
        this.fileAge = {};
        this.core = {
            serverConfig: readParsedSync(`./assets/database/configs/server.json`),
            botTemplate: readParsedSync(`./assets/database/configs/schema/botTemplate.json`),
            clientSettings: readParsedSync(`./assets/database/configs/client.settings.json`).data,
            gameplay: readParsedSync(`./assets/database/configs/gameplay.json`),
            globals: readParsedSync(`./assets/database/configs/globals.json`).data,
            locations: readParsedSync(`./assets/database/configs/locations.json`),
            hideoutSettings: readParsedSync(`./assets/database/hideout/settings.json`).data,
            blacklist: readParsedSync(`./assets/database/configs/blacklist.json`),
            metrics: readParsedSync(`./assets/database/configs/matchMetrics.json`),
            connections: {
                webSocket: {},
                webSocketPings: {}
            },
            mongoIds: new MongoId(syncGetRandomIntInc(1, 16777215))
        };
    };
}
module.exports = new Database();

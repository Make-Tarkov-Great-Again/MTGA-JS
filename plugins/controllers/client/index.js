const clientController = require("./clientController");
const friendController = require("./friendController");
const gameController = require("./gameController");
const menuController = require("./menuController");
const tradingController = require("./tradingController");

module.exports = {
    ...clientController,
    ...friendController,
    ...gameController,
    ...menuController,
    ...tradingController
}
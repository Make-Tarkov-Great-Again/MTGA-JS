const ClientController = require("./clientController");
const FriendController = require("./friendController");
const GameController = require("./gameController");
const MenuController = require("./menuController");
const TradingController = require("./tradingController");
const BundlesController = require("./bundlesController");

module.exports = {
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...MenuController,
    ...TradingController,
    ...BundlesController
}
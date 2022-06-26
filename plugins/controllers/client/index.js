const ClientController = require("./ClientController");
const FriendController = require("./FriendController");
const GameController = require("./GameController");
const MenuController = require("./MenuController");
const TradingController = require("./TradingController");
const BundlesController = require("./BundlesController");

module.exports = {
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...MenuController,
    ...TradingController,
    ...BundlesController
}
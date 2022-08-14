const ClientController = require("./ClientController");
const FriendController = require("./FriendController");
const GameController = require("./GameController");
const MenuController = require("./MenuController");
const TradingController = require("./TradingController");
const BundlesController = require("./BundlesController");
const LocationController = require("./LocationController");
const AccountController = require("./AccountController");
const WeblauncherController = require("./WeblauncherController");

module.exports = {
    ...AccountController,
    ...BundlesController,
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...LocationController,
    ...MenuController,
    ...TradingController,
    ...WeblauncherController
};

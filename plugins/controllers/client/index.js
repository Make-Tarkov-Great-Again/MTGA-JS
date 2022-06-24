const ClientController = require("./ClientController");
const FriendController = require("./FriendController");
const GameController = require("./GameController");
const MenuController = require("./MenuController");
const TradingController = require("./TradingController");

module.exports = {
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...MenuController,
    ...TradingController
}
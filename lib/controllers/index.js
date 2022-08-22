const ClientController = require("./ClientController");
const FriendController = require("./FriendController");
const GameController = require("./GameController");
const MenuController = require("./MenuController");
const TradingController = require("./TradingController");
const BundlesController = require("./BundlesController");
const LocationController = require("./LocationController");
const AccountController = require("./AccountController");
const WeblauncherController = require("./WeblauncherController");
const RaidController = require("./RaidController");
const ItemController = require("./ItemController");
const HideoutController = require("./HideoutController");
const ProfileController = require("./ProfileController");
const NoteController = require("./NoteController");

module.exports = {
    ...AccountController,
    ...BundlesController,
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...LocationController,
    ...MenuController,
    ...TradingController,
    ...WeblauncherController,
    ...RaidController,
    ...ItemController,
    ...HideoutController,
    ...ProfileController,
    ...NoteController
};

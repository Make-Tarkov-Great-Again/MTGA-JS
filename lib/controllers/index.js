const ClientController = require("./ClientController");
const FriendController = require("./FriendController");
const GameController = require("./GameController");
const MenuController = require("./MenuController");
const TraderController = require("./TraderController");
const BundlesController = require("./BundlesController");
const LocationController = require("./LocationController");
const AccountController = require("./AccountController");
const WeblauncherController = require("./WeblauncherController");
const RaidController = require("./RaidController");
const ItemController = require("./ItemController");
const HideoutController = require("./HideoutController");
const ProfileController = require("./ProfileController");
const NoteController = require("./NoteController");
const PresetController = require("./PresetController");
const InsuranceController = require("./InsuranceController");
const NotificationController = require("./NotificationController");


module.exports = {
    ...AccountController,
    ...BundlesController,
    ...ClientController,
    ...FriendController,
    ...GameController,
    ...LocationController,
    ...MenuController,
    ...TraderController,
    ...WeblauncherController,
    ...RaidController,
    ...ItemController,
    ...HideoutController,
    ...ProfileController,
    ...NoteController,
    ...PresetController,
    ...InsuranceController,
    ...NotificationController
};

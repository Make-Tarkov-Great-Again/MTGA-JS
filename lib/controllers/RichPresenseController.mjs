import { rpc } from "../../app.mjs";
import { RichPresense, Trader } from "../classes/_index.mjs";
import { getRandomFromArray, logger } from "../utilities/_index.mjs";


const DETAILS = {
    LAUNCH: "Waiting for game",
    WEBLAUNCHER: "In WebLauncher",

    IN_RAID_MENU: "Starting a raid...", // client/raid/configuration
    RAID_LOADING: "Loading into Raid", //getLocalLoot or botGenerate or client/game/start
    IN_RAID: "In Raid", // client/raid/configuration

    MISSINGINACTION: "Raid Status: Missing In Action",
    RUNNER: "Raid Status: Run-Through",
    LEFT: "Raid Status: Left I guess...",
    KILLED: "Raid Status: Killed",
    SURVIVED: "Raid Status: Survived",

    STASH: "In Stash",

    TRADING: `Trading with {{replace_me}}`, // /client/trading/api/getTraderAssort/:traderId
    RAGFAIR: "Browsing Flea Market", // ragfair/find

    DEFAULT: getRandomFromArray([
        'Trying to finish a Gunsmith quest',
        'Knocking on Nikitas door',
        'Petting the Hideout cat',
        'Waiting for coop',
        'Listening to Lofi Scav',
        'Trolling on the tarkov subreddit',
        'Waiting for AKI support',
        'Eating Tuschonka',
        'Watching a porn dvd i found at Factory',
        'Remembering the good times',
        'Failing to keep my stash organized',
        'Eating kings hot-pocket',
        'Stealing Nehaxs food again',
        'Fixing kestrels code again...',
        'Praying for phat loot'
    ]),
};

const STATES = {
    LAUNCH: "Launching Escape From Tarkov", // /launcher/weblauncher/start
    HOME: "Idling on the Home Page...", // /
    LOGIN: "Logging in", // /webinterface/account/login
    REGISTER: "Registering account",  // /webinterface/account/register
    SETTINGS: "Adjusting Settings", // /webinterface/account/settings
    PROFILE_EDITOR: getRandomFromArray([
        "Adding more money to my stash because I am shit at the game...",
        "Setting my skills to max because too grindy",
        "Setting all quests to AvailableForFinish",
        "Unlocking Jaeger so i dont have to play woods",
        "Disappointing my parents"
    ]),
    MOD_MANAGER: getRandomFromArray([
        "Adding furry trader mods for ENHANCED GAMEPLAY AND IMMERSION",
        "Installing illegally ported and uncredited gun mods",
        "Initializing Co-op Mod",
        "Downloading sketchy chinese AKI ported mods...",
        "Adding more items to break the game even further",
        "Litterly just downloading EFT cheats",
        "Stealing Sam-Swats mod ideas",
        "Fuck you dave"
    ]),

    MAP: "Choosing a map", //singleplayer/settings/raid/menu
    MISSINGINACTION: getRandomFromArray([
        "Sat hiding in a corner too long",
        "Ran out of stamina trying to get to extract",
        "Didn't have enough money for Car Extract",
        "Boat Extract wasn't open",
        "Ran to wrong Extract lol"
    ]),
    RUNNER: "Just runnin' through",
    LEFT: "Left I guess...",
    KILLED: getRandomFromArray([
        "I was lagging I swear",
        "Those bots are cracked wtf",
        "Forgot to bring my fuckinG MEDS!!!!!!!",
        "HES CHEATING!!!"
    ]),
    SURVIVED: getRandomFromArray([
        "EZ",
        "Finally got that quest done",
        "Why tf did Jaegar need me to chop off my toes to shoot 18 scavs?"
    ]),

    STASH: "In Stash",
    TRADING: "Browsing wares",
    SERVICES: "Browsing for new drip",
    RAGFAIR: getRandomFromArray([
        `Cheating because I can't find the item in raid like a man`,
        "Buying my quest items because I can't stop W keying in raid",
        "Buying Meta Gun parts because I don't actually have fun when I play this game",
        "Disappointing my parents"
    ]),

    DEFAULT: getRandomFromArray([
        'Trying to finish a Gunsmith quest',
        'Knocking on Nikitas door',
        'Petting the Hideout cat',
        'Waiting for coop',
        'Listening to Lofi Scav',
        'Trolling on the tarkov subreddit',
        'Waiting for AKI support',
        'Eating Tuschonka',
        'Watching a porn dvd i found at Factory',
        'Remembering the good times',
        'Failing to keep my stash organized',
        'Eating kings hot-pocket',
        'Stealing Nehaxs food again',
        'Fixing kestrels code again...',
        'Praying for phat loot'
    ]),
}

export class RichPresenseController {

    static async OnHome(sessionID) {
        const activity = !sessionID
            ? RichPresense.generateLoginActivity()
            : RichPresense.get(sessionID);

        activity.state = STATES.HOME;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnLogin(sessionID) {
        const activity = !sessionID
            ? RichPresense.generateLoginActivity()
            : RichPresense.get(sessionID);

        activity.state = STATES.LOGIN;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnProfileEditor(sessionID) {
        const activity = !sessionID
            ? RichPresense.generateLoginActivity()
            : RichPresense.get(sessionID);

        activity.state = STATES.PROFILE_EDITOR;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnGameStart(sessionID) {
        const activity = !sessionID
            ? RichPresense.generateLoginActivity()
            : RichPresense.get(sessionID);

        activity.state = STATES.LAUNCH;
        activity.details = DETAILS.LAUNCH;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnSettings(sessionID) {
        const activity = !sessionID
            ? RichPresense.generateLoginActivity()
            : RichPresense.get(sessionID);

        activity.state = STATES.SETTINGS;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async onStash(sessionID) { // /client/game/profile/items/moving:
        const activity = RichPresense.get(sessionID);
        activity.state = STATES.DEFAULT;
        activity.details = DETAILS.STASH;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity)
    }

    static async OnTraderMenu(sessionID, traderID) { //client/getTraderAssort/:traderID
        const activity = RichPresense.get(sessionID);
        const traderName = Trader.getTraderName(traderID);
        activity.state = STATES.TRADING;
        activity.details = DETAILS.TRADING.replace("{{replace_me}}", traderName);
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnTraderMenuServices(sessionID, traderID) { //client/trading/customization/:traderID
        const activity = RichPresense.get(sessionID);
        const traderName = Trader.getTraderName(traderID);
        activity.state = STATES.SERVICES;
        activity.details = DETAILS.TRADING.replace("{{replace_me}}", traderName);
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnFleaMarket(sessionID) {
        const activity = RichPresense.get(sessionID);
        activity.state = STATES.RAGFAIR;
        activity.details = DETAILS.RAGFAIR;
        activity.startTimestamp = Date.now(); //

        await RichPresense.setActivity(activity);
    }

    static async OnMapSelection(sessionID) {
        const activity = RichPresense.get(sessionID);
        activity.state = STATES.MAP;
        activity.details = DETAILS.DEFAULT;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity)
    }

    static async OnLoadingIntoRaid(sessionID, raidMapName) {
        const activity = RichPresense.get(sessionID);
        activity.state = raidMapName;
        activity.details = DETAILS.IN_RAID;

        await RichPresense.setActivity(activity)
    }

    static async OnEndRaid(sessionID, exitStatus) {
        const EXIT_STATUS = exitStatus.toUpperCase();
        const activity = RichPresense.get(sessionID);

        activity.state = STATES.EXIT_STATUS;
        activity.details = DETAILS.EXIT_STATUS;

        await RichPresense.setActivity(activity);
    }

    static async OnHideout(sessionID) {
        await RichPresense.setActivity(activity);
    }
}

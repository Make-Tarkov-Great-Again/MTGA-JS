import { RichPresense, Trader } from "../classes/_index.mjs";
import { getRandomFromArray } from "../utilities/_index.mjs";


const DETAILS = {
    LAUNCH: "Waiting for game",
    WEBLAUNCHER: "In WebLauncher",

    MAIN_MENU: "On Main Menu",

    IN_RAID_MENU: "In Raid Menu", // client/raid/configuration
    RAID_LOADING: "Loading into Raid", //getLocalLoot or botGenerate or client/game/start
    IN_RAID: "In Raid", // client/raid/configuration
    IN_HIDEOUT: "In Hideout",

    MISSINGINACTION: "Raid Status: Missing In Action",
    RUNNER: "Raid Status: Run-Through",
    LEFT: "Raid Status: Exited Through Menu",
    KILLED: "Raid Status: Killed",
    SURVIVED: "Raid Status: Survived",

    STASH: "In Stash",
    HIDEOUT: "In Hideout",

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
    FACTORY: getRandomFromArray([
        "Getting raped by Tagilla",
        "Doing a hachet run to hopefully get a gun",
        "Failing to finish Stirup",
        "Looking for screws",
        "Forgetting my NVGs on Factory"
    ]),
    CUSTOMS: getRandomFromArray([
        "Just one more salawa please..",
        "Getting shot at from fortress by a scav on PKM",
        "Being a stash goblin",
        "Too scared to go interchange",
        "Getting raped by the goons"
    ]),
    INTERCHANGE: getRandomFromArray([
        "I dont know where killa spawns",
        "Being a rat for electronics loot",
        "Please just one more gas an",
        "Where the fuck am i getting shot from",
        "Idk where ultra medical is"
    ]),
    LIGHTHOUSE: getRandomFromArray([
        "Where the fuck am i?",
        "LET ME IN LIGHTKEEPER",
        "Woah whos that skull dude on that rock!",
        "Where the fuck are these extracts",
        "Theres stashes on this map?"
    ]),
    LABORATORY: getRandomFromArray([
        "18 RAIDERS IN ONE RAID WHAT THE FUCK?",
        "Where the fuck is Ventilation",
        "*Uses a spawned in keycard*",
        "IM OUT OF AMMO!",
        "Scavs here? No way man."
    ]),
    STREES_OF_TARKOV: getRandomFromArray([
        "*Getting 15 FPS* WOW SO OPTIMIZED",
        "Why did i die while walking down that street!!1",
        "\"Biggest Update\"",
        "Player is lost",
        "Fuck you Nikita"
    ]),
    RESERVEBASE: getRandomFromArray([
        "Grubbing high-tier loot",
        "Hiding from Gluhar",
        "Oh whats that sound behin- *Dead*",
        "Ransacking cafeteria",
        "Hitting drop down for the 30th time in a row"
    ]),
    SHORELINE: getRandomFromArray([
        "Theres stashes here?",
        "Aw fuck the boats not here",
        "Dying to sanitar",
        "Praying for a red keycard",
        "Running out of water again"
    ]),
    WOODS: getRandomFromArray([
        "\"Best map in the game\" -Nehax",
        "WHERE THE FUCK AM I????",
        "Why are the trees speaking vietmanese?",
        "*Dies to a landmine again*",
        "Too scared to go Sawmill",
        "\"I only use thermals\" type beat"
    ]),

    STASH: "In Stash",
    TRADING: "Browsing wares",
    IN_HIDEOUT: getRandomFromArray([
        "Petting hideout cat",
        "Masterbating",
        "God dammit one more screw for lvl 2",
        "Deafening myself by shooting in a bunker",
        "Mining BitCoins and crafting MoonShine!",
        "Waiting for my gas analyzer"
    ]),
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
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID)
            ? RichPresense.get(sessionID)
            : RichPresense.generateLoginActivity();

        activity.state = STATES.HOME;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnLogin(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID)
            ? RichPresense.get(sessionID)
            : RichPresense.generateLoginActivity();

        activity.state = STATES.LOGIN;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnProfileEditor(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID)
            ? RichPresense.get(sessionID)
            : RichPresense.generateLoginActivity();

        activity.state = STATES.PROFILE_EDITOR;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnGameStart(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID)
            ? RichPresense.get(sessionID)
            : RichPresense.generateLoginActivity();

        activity.state = STATES.LAUNCH;
        activity.details = DETAILS.LAUNCH;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnSettings(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID)
            ? RichPresense.get(sessionID)
            : RichPresense.generateLoginActivity();

        activity.state = STATES.SETTINGS;
        activity.details = DETAILS.WEBLAUNCHER;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnMainMenu(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);

        activity.state = STATES.MAIN_MENU;
        activity.details = DETAILS.DEFAULT;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async onStash(sessionID) { // /client/game/profile/items/moving:
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        activity.state = STATES.DEFAULT;
        activity.details = DETAILS.STASH;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity)
    }

    static async OnTraderMenu(sessionID, traderID) { //client/getTraderAssort/:traderID
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        const traderName = Trader.getTraderName(traderID);
        activity.state = STATES.TRADING;
        activity.details = DETAILS.TRADING.replace("{{replace_me}}", traderName);
        activity.largeImageKey = traderName.toLowerCase()
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnTraderMenuServices(sessionID, traderID) { //client/trading/customization/:traderID
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        const traderName = Trader.getTraderName(traderID);
        activity.state = STATES.SERVICES;
        activity.details = DETAILS.TRADING.replace("{{replace_me}}", traderName);
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }

    static async OnFleaMarket(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        activity.state = STATES.RAGFAIR;
        activity.details = DETAILS.RAGFAIR;
        activity.largeImageKey = "fleamarket"
        activity.startTimestamp = Date.now(); //

        await RichPresense.setActivity(activity);
    }

    static async OnMapSelection(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        activity.state = STATES.MAP;
        activity.details = DETAILS.DEFAULT;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity)
    }

    static async OnLoadingIntoRaid(sessionID, raidMapName) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);
        activity.state = raidMapName.toUpperCase().replace(" ", "_")
        activity.details = DETAILS.IN_RAID;
        activity.largeImageKey = raidMapName.toLowerCase()
        activity.largeImageText = raidMapName

        await RichPresense.setActivity(activity)
    }

    static async OnEndRaid(sessionID, exitStatus) {
        if (!RichPresense.checkInternet()) return;

        const EXIT_STATUS = exitStatus.toUpperCase();
        const activity = RichPresense.get(sessionID);

        activity.state = STATES[EXIT_STATUS];
        activity.details = DETAILS[EXIT_STATUS];

        await RichPresense.setActivity(activity);
    }

    static async OnHideout(sessionID) {
        if (!RichPresense.checkInternet()) return;

        const activity = RichPresense.get(sessionID);

        activity.state = STATES.IN_HIDEOUT;
        activity.details = DETAILS.HIDEOUT;
        activity.startTimestamp = Date.now();

        await RichPresense.setActivity(activity);
    }
}

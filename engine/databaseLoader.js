const fs = require('fs');
const {
    logger,
    readParsed,
    fileExist,
    stringify,
    writeFile,
    getDirectoriesFrom,
    createDirectory
} = require('./../plugins/utilities/');
const { Account, Trader, Item, Locale, Language, Edition, Profile, Customization, Character, HideoutArea, HideoutProduction, HideoutSetting, HideoutScavcase } = require('../plugins/models');



class DatabaseLoader {
    constructor () {

    }
    
    static async loadDatabase() {
        await Promise.all([
            this.loadCore(),
            this.loadItems(),
            this.loadHideout(),
            this.loadWeather(),
            this.loadLanguages(),
            this.loadLocales(),
            this.loadTemplates(),
            this.loadTraders(),
            //this.loadBots(),
            this.loadCustomization(),
            // Model Data //
        ]);
        await this.loadEditions();
        await this.loadAccounts();
        await this.loadProfiles();
    }
    
    /**
    * Loads the core configurations
    */
    static async loadCore() {
        const database = require('./database');
        database.core = {
            serverConfig: readParsed(`./database/configs/server.json`),
            matchMetrics: readParsed(`./database/configs/matchMetrics.json`),
            globals: readParsed(`./database/configs/globals.json`),
            botTemplate: readParsed(`./database/configs/schema/botTemplate.json`),
            fleaOfferTemplate: readParsed(`./database/configs/schema/fleaOfferTemplate.json`),
            botCore: readParsed(`./database/bots/botCore.json`),
            clientSettings: readParsed(`./database/configs/client.settings.json`),
            gameplay: readParsed(`./database/configs/gameplay.json`),
        };
    }

    /**
     * Load hideout data in parallel.
     */
     static async loadHideout() {
        const database = require('./database');
        database.hideout = {
            areas: [],
            productions: [],
            scavcase: [],
            settings: []
        };

        let hideoutAreas = readParsed('./database/hideout/areas.json')
        if (typeof hideoutAreas.data != "undefined") { hideoutAreas = hideoutAreas.data; }
        for (const [index, area] of Object.entries(hideoutAreas)) {
            await this.createModelFromParseWithID('HideoutArea', index, area);
        }

        let hideoutProductions = readParsed('./database/hideout/productions.json');
        if (typeof hideoutProductions.data != "undefined") { hideoutProductions = hideoutProductions.data; }
        for (const [index, production] of Object.entries(hideoutProductions)) {
            await this.createModelFromParseWithID('HideoutProduction', index, production);
        }


        let hideoutScavcase = readParsed('./database/hideout/scavcase.json');
        if (typeof hideoutScavcase.data != "undefined") { hideoutScavcase = hideoutScavcase.data; }
        for (const [index, scavcase] of Object.entries(hideoutScavcase)) {
            await this.createModelFromParseWithID('HideoutScavcase', index, scavcase);
        }

        let hideoutSettings = readParsed('./database/hideout/settings.json')
        if (typeof hideoutSettings.data != "undefined") { hideoutSettings = hideoutSettings.data; }
        for (const [index, setting] of Object.entries(hideoutSettings)) {
            await this.createModelFromParseWithID('HideoutSetting', index, setting);
        }
    }


    /**
     * Load weather data in parallel.
     */
     static async loadWeather() {
        const database = require('./database');
        database.weather = readParsed('./database/weather.json')
        if (typeof database.weather.data != "undefined") { database.weather = database.weather.data; }
    }

    /**
     * Load templates data in parallel.
     */
     static async loadTemplates() {
        const database = require('./database');
        let templatesData = readParsed('./database/templates.json')
        if (typeof templatesData.data != "undefined") { templatesData = templatesData.data; }

        database.templates = {
            "Categories": templatesData.Categories,
            "Items": templatesData.Items
        };
    }

    /**
     * Load editions data in parallel.
     */

     static async regenerateRagfair() {
        /**
         * Ragfair needs to be created in a meticulous way this time around
         * We need to compensate for the fact that the items in the assort
         * won't always be correct or up to date, so we need to create functions
         * to generate that data, and then use that data to populate the flea.
         */
    }

    /////////////////// MODEL DATA ///////////////////

    static async createModelFromParse(model, data) {
        let classModel = eval(`new ${model}`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createModelFromParseWithID(model, id, data) {
        let classModel = eval(`new ${model}("${id}")`);
        for (const [key, value] of Object.entries(data)) {
            classModel[key] = value;
        }

        return classModel;
    }

    static async createCollectionFromParse(model, dataSet) {
        let collection = {};
        for (const [index, data] of Object.entries(dataSet)) {
            collection[index] = await this.createModelFromParse(model, data);
        }

        return collection;
    }

    // Load Customization 
    static async loadCustomization() {
        let customizations = readParsed("./database/customization.json");
        if (typeof customizations.data != "undefined") customizations = customizations.data;
        for (const [index, customization] of Object.entries(customizations)) {
            await this.createModelFromParseWithID('Customization', index, customization);
        }

    }

    // Load Dialogues
    static async loadDialogues() {

    }

    // Load Editions
    static async loadEditions() {
        const editionKeys = getDirectoriesFrom('./database/editions/');
        for (const editionType of editionKeys) {
            const path = `./database/editions/${editionType}/`;
            let edition = await this.createModelFromParseWithID('Edition', editionType, {});
            edition.id = editionType;
            edition.bear = await this.createModelFromParse("Character", readParsed(`${path}character_bear.json`));
            await edition.bear.solve();
            edition.usec = await this.createModelFromParse("Character", readParsed(`${path}character_usec.json`));
            await edition.usec.solve();
            edition.storage = readParsed(`${path}storage.json`);
        }
        const database = require('./database');
    }

    // Load Items
    static async loadItems() {
        const database = require('./database');
        let items = readParsed('./database/items.json');
        if (typeof items.data != "undefined") { items = items.data; }

        for (const [index, item] of Object.entries(items)) {
            let _item = await this.createModelFromParseWithID('Item', index, item);
        }
    }

    static async loadLanguages() {
        let languages = readParsed(`./database/locales/languages.json`);
        if (typeof languages.data != "undefined") { languages = languages.data; }
        for (const [index, language] of Object.entries(languages)) {
            await this.createModelFromParseWithID('Language', language.ShortName, language);
        }
    }

    // Load language
    static async loadLocales() {
        const localeKeys = getDirectoriesFrom(`./database/locales`);
        this.locales = {};
        for (const locale in localeKeys) {
            const localeIdentifier = localeKeys[locale];
            const currentLocalePath = `./database/locales/` + localeIdentifier + `/`;
            if (fileExist(`${currentLocalePath}locale.json`) && fileExist(`${currentLocalePath}menu.json`)) {
                let localeCopy = readParsed(`${currentLocalePath}locale.json`);
                if (typeof localeCopy.data != "undefined") { localeCopy = localeCopy.data; }

                let menuCopy = readParsed(`${currentLocalePath}menu.json`);
                if (typeof menuCopy.data != "undefined") { menuCopy = menuCopy.data; }

                await this.createModelFromParseWithID('Locale', localeIdentifier, {
                    locale: localeCopy,
                    menu: menuCopy
                });
            }
        }
    }

    // Load Traders
    static async loadTraders() {
        const traderKeys = getDirectoriesFrom('./database/traders');
        for (const traderID of traderKeys) {
            const path = `./database/traders/${traderID}/`;

            let trader = await this.createModelFromParseWithID('Trader', traderID, {});

            if (fileExist(`${path}categories.json`)) {
                trader.base = readParsed(`${path}base.json`);
                //fix?
                trader.base.repair.price_rate = null;
            } else {
                trader.base = [];
            }

            if (fileExist(`${path}categories.json`)) {
                trader.categories = readParsed(`${path}categories.json`)
                trader.base.sell_category = readParsed(`${path}categories.json`);
            } else {
                trader.base.sell_category = [];
            }

            if (fileExist(`${path}questassort.json`)) {
                trader.questassort = readParsed(`${path}questassort.json`);
            }

            let assort = readParsed(`${path}assort.json`);
            if (!typeof assort.data === "undefined") {
                assort = assort.data;
            }

            trader.assort = assort;

            if (fileExist(`${path}suits.json`)) {
                trader.suits = readParsed(`${path}suits.json`);
            } else {
                trader.suits = [];
            }

            if (fileExist(`${path}dialogue.json`)) {
                trader.dialogue = readParsed(`${path}dialogue.json`);
            } else {
                trader.dialogue = [];
            }
        }
    }

    // Account data processing //
    static async loadAccounts() {
        const { database } = require('../app');
        if (!fileExist("./user/profiles")) {
            createDirectory("./user/profiles");
        }

        for (const profileID of getDirectoriesFrom('/user/profiles')) {
            if (fileExist("./user/profiles/" + profileID + "/account.json")) {
                logger.logDebug("[DATABASE][ACCOUNTS] Loading user account " + profileID);

                let account = await this.createModelFromParseWithID('Account', profileID, readParsed("./user/profiles/" + profileID + "/account.json"));
                await account.solve();

                const stats = fs.statSync(`./user/profiles/${profileID}/account.json`);
                database.fileAge[profileID] = { account: stats.mtimeMs };
            }
        }
    }

    // Profile data processing //
    static async loadProfiles() {
        for (const profileID of getDirectoriesFrom('/user/profiles')) {
            let profile = await this.createModelFromParseWithID("Profile", profileID, {
                character: [],
                storage: {},
                userbuilds: {},
                dialogue: {},
            });
            const path = `./user/profiles/${profileID}/`;
            let stats;

            if (fileExist(`${path}character.json`)) {
                logger.logWarning(`Loading character data for profile ${profileID}`);
                profile.character = await this.createModelFromParse("Character", readParsed("./user/profiles/" + profileID + "/character.json"));

                stats = fs.statSync(`./user/profiles/${profileID}/character.json`);
                database.fileAge[profileID].character = stats.mtimeMs;
            }

            if (fileExist(`${path}storage.json`)) {
                logger.logWarning(`Loading storage data for profile ${profileID}`);
                profile.storage = readParsed("./user/profiles/" + profileID + "/storage.json");
                
                stats = fs.statSync(`./user/profiles/${profileID}/storage.json`);
                database.fileAge[profileID].storage = stats.mtimeMs;
            }

            if (fileExist(`${path}userbuilds.json`)) {
                logger.logWarning(`Loading userbuilds data for profile ${profileID}`);

                let parsedBuilds = readParsed("./user/profiles/" + profileID + "/userbuilds.json");
                if (typeof parsedBuilds.data != "undefined") { parsedBuilds = parsedBuilds.data; }
                profile.userbuilds = await this.createCollectionFromParse("Userbuild", ) 

                stats = fs.statSync(`./user/profiles/${profileID}/userbuilds.json`);
                database.fileAge[profileID].userbuilds = stats.mtimeMs;
            }

            if (fileExist(`${path}dialogue.json`)) {
                logger.logWarning(`Loading dialogue data for profile ${profileID}`);

                let parsedDialogues = readParsed("./user/profiles/" + profileID + "/dialogue.json");
                if (typeof parsedDialogues.data != "undefined") { parsedDialogues = parsedDialogues.data; }
                profile.userbuilds = await this.createCollectionFromParse("Dialogue", parsedDialogues) 

                stats = fs.statSync(`./user/profiles/${profileID}/dialogue.json`);
                database.fileAge[profileID].dialogue = stats.mtimeMs;
            }
        }
    }
}

module.exports.DatabaseLoader = DatabaseLoader;

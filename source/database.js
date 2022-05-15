'use strict'
const fileIO = require('../plugins/utilities/fileIO');

/**
 * Return completed database
 */
const Database = class {
    constructor() {
        this.core;
        this.items;
        this.hideout;
        this.weather;
        this.locales;
        this.templates;
        //this.bots;
        //this.profiles;
        this.traders;
    }

    async loadDatabase() {
        await Promise.all([
            this.loadCore(),
            this.loadItems(),
            this.loadHideout(),
            this.loadWeather(),
            this.loadLanguage(),
            this.loadTemplates(),
            this.loadTraders(),
            //this.loadProfiles(),
            //this.loadBots()
        ]);
    }
    /**
    * Loads the core configurations
    */
    async loadCore() {
        this.core = {
            serverConfig: fileIO.readParsed(`./database/base/config/server.json`),

            matchMetrics: fileIO.readParsed(`./database/base/matchMetrics.json`),
            globals: fileIO.readParsed(`./database/base/globals.json`).data,

            botTemplate: fileIO.readParsed(`./database/base/schema/botTemplate.json`),
            fleaOfferTemplate: fileIO.readParsed(`./database/base/schema/fleaOfferTemplate.json`),

            botCore: fileIO.readParsed(`./database/bots/botCore.json`)
        }
    }

    /**
     * Load item data in parallel.
     */
    async loadItems() {
        //util.logger.logDebug("# Database: Loading items", 1)
        const itemsDump = fileIO.readParsed('./database/items.json');
        this.items = itemsDump.data;
        //util.logger.logDebug("# Database: Loading items", 2);
    }
    /**
     * Load hideout data in parallel.
     */
    async loadHideout() {
        //util.logger.logDebug("# Database: Loading hideout", 1)
        this.hideout = {
            areas: fileIO.readParsed('./database/hideout/areas.json').data,
            productions: fileIO.readParsed('./database/hideout/productions.json').data,
            scavcase: fileIO.readParsed('./database/hideout/scavcase.json').data,
            settings: fileIO.readParsed('./database/hideout/settings.json').data,
        };
        //util.logger.logDebug("# Database: Loading hideout", 2)
    }

    /**
     * Load weather data in parallel.
     */
    async loadWeather() {
        //util.logger.logDebug("# Database: Loading weather", 1)
        this.weather = fileIO.readParsed('./database/weather.json').data;
        //util.logger.logDebug("# Database: Loading weather", 2)
    }

    /**
     * Load language data in parallel.
     */
    async loadLanguage() {
        //util.logger.logDebug("# Database: Loading languages", 1)
        const allLangs = fileIO.getDirectoriesFrom(`./database/locales`);
        this.locales = { "languages": [] };
        for (const lang in allLangs) {
            const locale = allLangs[lang];
            const currentLocalePath = `./database/locales/` + locale + `/`;
            if (fileIO.fileExist(`${currentLocalePath}locale.json`) && fileIO.fileExist(`${currentLocalePath}menu.json`)) {
                let localeCopy = fileIO.readParsed(`${currentLocalePath}locale.json`)
                if (typeof localeCopy.data != "undefined") { localeCopy = localeCopy.data; }

                let menuCopy = fileIO.readParsed(`${currentLocalePath}menu.json`)
                if (typeof menuCopy.data != "undefined") { menuCopy = menuCopy.data; }

                this.locales[locale] = {
                    locale: localeCopy,
                    menu: menuCopy,
                };
                this.locales.languages.push(locale);
            } else {
                console.log(`# Database: Missing locale files for ${locale}`);
            }
        }
        //util.logger.logDebug("# Database: Loading languages", 2)
    }

    /**
     * Load templates data in parallel.
     */
    async loadTemplates() {
        //util.logger.logDebug("# Database: Loading templates", 1)
        const templatesData = fileIO.readParsed('./database/templates.json').data;
        this.templates = {
            "Categories": templatesData.Categories,
            "Items": templatesData.Items,
        };
        //util.logger.logDebug("# Database: Loading templates", 2)
    }

    /**
     * Load profiles data in parallel.
     */
    async loadProfiles() {
        //util.logger.logDebug("# Database: Loading profiles", 1)
        const profilesKeys = fileIO.getDirectoriesFrom('./server/db/profiles');
        this.profiles = {};
        for (let profileType of profilesKeys) {
            const path = `./server/db/profiles/${profileType}/`;
            this.profiles[profileType] = {};
            this.profiles[profileType]["character"] = fileIO.readParsed(`${path}character.json`);
            this.profiles[profileType]["initialTraderStanding"] = fileIO.readParsed(`${path}initialTraderStanding.json`);
            this.profiles[profileType]["inventory_bear"] = fileIO.readParsed(`${path}inventory_bear.json`);
            this.profiles[profileType]["inventory_usec"] = fileIO.readParsed(`${path}inventory_usec.json`);
            //this.profiles[profileType]["starting_outfit"] = util.fileIO.readParsed(`${path}starting_outfit.json`);
            this.profiles[profileType]["storage"] = fileIO.readParsed(`${path}storage.json`);
        }
        //util.logger.logDebug("# Database: Loading profiles", 2)
    }

    /**
     * Load traders base data in parallel.
     */
    async loadTraders() {
        //util.logger.logDebug("# Database: Loading traders", 1)
        const traderKeys = fileIO.getDirectoriesFrom('./database/traders');
        this.traders = { names: {} };
        for (let traderID of traderKeys) {

            const path = `./database/traders/${traderID}/`;
            this.traders[traderID] = { base: {}, assort: {}, categories: {} };

            // read base and assign to variable
            const traderBase = fileIO.readParsed(`${path}base.json`);
            this.traders[traderID].base = traderBase

            // create names object and assign trader nickname to traderID
            let nickname = traderBase.nickname;
            if (nickname === "Unknown") nickname = "Ragfair";
            this.traders.names[nickname] = traderID;

            // if quest assort exists, read and assign to variable
            if (fileIO.fileExist(`${path}questassort.json`)) {
                this.traders[traderID].questassort = fileIO.readParsed(`${path}questassort.json`);
            }

            // read assort and assign to variable
            let assort = fileIO.readParsed(`${path}assort.json`);
            // give support for assort dump files
            if (!typeof assort.data == "undefined") {
                assort = assort.data;
            }
            this.traders[traderID].assort = assort;

            // check if suits exists, read and assign to variable
            if (fileIO.fileExist(`${path}suits.json`)) {
                this.traders[traderID].suits = fileIO.readParsed(`${path}suits.json`);
            }

            // check if dialogue exists, read and assign to variable
            if (fileIO.fileExist(`${path}dialogue.json`)) {
                this.traders[traderID].dialogue = fileIO.readParsed(`${path}dialogue.json`);
            }
        }

        /**
         * Ragfair will need to be regenerated to the database later
         * so that we can populate the assort with the correct/missing item data.
         * It may be best to do this as a separate step, and call it here.
         */

        //util.logger.logDebug("# Database: Loading traders", 2)
    }

    async regenerateRagfair() {
        /**
         * Ragfair needs to be created in a meticulous way this time around
         * We need to compensate for the fact that the items in the assort
         * won't always be correct or up to date, so we need to create functions
         * to generate that data, and then use that data to populate the flea.
         */
    }
}
module.exports = new Database();
'use strict'
const {
    readParsed,
    fileExist,
    getDirectoriesFrom,
  } = require('./../plugins/utilities/fileIO');

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
        this.profiles;
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
            this.loadProfiles(),
            //this.loadBots()
        ]);
    }
    /**
    * Loads the core configurations
    */
    async loadCore() {
        this.core = {
            serverConfig: readParsed(`./database/configs/server.json`),

            matchMetrics: readParsed(`./database/configs/matchMetrics.json`),
            globals: readParsed(`./database/configs/globals.json`).data,

            botTemplate: readParsed(`./database/configs/schema/botTemplate.json`),
            fleaOfferTemplate: readParsed(`./database/configs/schema/fleaOfferTemplate.json`),

            botCore: readParsed(`./database/bots/botCore.json`)
        }
    }

    /**
     * Load item data in parallel.
     */
    async loadItems() {
        const itemsDump = readParsed('./database/items.json');
        this.items = itemsDump.data;
    }
    /**
     * Load hideout data in parallel.
     */
    async loadHideout() {
        this.hideout = {
            areas: readParsed('./database/hideout/areas.json').data,
            productions: readParsed('./database/hideout/productions.json').data,
            scavcase: readParsed('./database/hideout/scavcase.json').data,
            settings: readParsed('./database/hideout/settings.json').data,
        };
    }

    /**
     * Load weather data in parallel.
     */
    async loadWeather() {
        this.weather = readParsed('./database/weather.json').data;
    }

    /**
     * Load language data in parallel.
     */
    async loadLanguage() {
        const allLangs = getDirectoriesFrom(`./database/locales`);
        this.locales = { "languages": [] };
        for (const lang in allLangs) {
            const locale = allLangs[lang];
            const currentLocalePath = `./database/locales/` + locale + `/`;
            if (fileExist(`${currentLocalePath}locale.json`) && fileExist(`${currentLocalePath}menu.json`)) {
                let localeCopy = readParsed(`${currentLocalePath}locale.json`)
                if (typeof localeCopy.data != "undefined") { localeCopy = localeCopy.data; }

                let menuCopy = readParsed(`${currentLocalePath}menu.json`)
                if (typeof menuCopy.data != "undefined") { menuCopy = menuCopy.data; }

                this.locales[locale] = {
                    locale: localeCopy,
                    menu: menuCopy,
                };
                this.locales.languages.push(locale);
            }
        }
    }

    /**
     * Load templates data in parallel.
     */
    async loadTemplates() {
        const templatesData = readParsed('./database/templates.json').data;
        this.templates = {
            "Categories": templatesData.Categories,
            "Items": templatesData.Items,
        };
    }

    /**
     * Load profiles data in parallel.
     */
    async loadProfiles() {
        const profilesKeys = getDirectoriesFrom('/database/profiles/');
        this.profiles = {};
        for (let profileType of profilesKeys) {
            const path = `./database/profiles/${profileType}/`;
            this.profiles[profileType] = {};
            this.profiles[profileType]["character_bear"] = readParsed(`${path}character_bear.json`);
            this.profiles[profileType]["character_usec"] = readParsed(`${path}character_usec.json`);
            this.profiles[profileType]["storage"] = readParsed(`${path}storage.json`);
        }
    }

    /**
     * Load traders base data in parallel.
     */
    async loadTraders() {
        const traderKeys = getDirectoriesFrom('./database/traders');
        this.traders = { names: {} };
        for (let traderID of traderKeys) {

            const path = `./database/traders/${traderID}/`;
            this.traders[traderID] = { base: {}, assort: {}, categories: {} };

            // read base and assign to variable
            const traderBase = readParsed(`${path}base.json`);
            this.traders[traderID].base = traderBase

            // create names object and assign trader nickname to traderID
            let nickname = traderBase.nickname;
            if (nickname === "Unknown") nickname = "Ragfair";
            this.traders.names[nickname] = traderID;

            // if quest assort exists, read and assign to variable
            if (fileExist(`${path}questassort.json`)) {
                this.traders[traderID].questassort = readParsed(`${path}questassort.json`);
            }

            // read assort and assign to variable
            let assort = readParsed(`${path}assort.json`);
            // give support for assort dump files
            if (!typeof assort.data == "undefined") {
                assort = assort.data;
            }
            this.traders[traderID].assort = assort;

            // check if suits exists, read and assign to variable
            if (fileExist(`${path}suits.json`)) {
                this.traders[traderID].suits = readParsed(`${path}suits.json`);
            }

            // check if dialogue exists, read and assign to variable
            if (fileExist(`${path}dialogue.json`)) {
                this.traders[traderID].dialogue = readParsed(`${path}dialogue.json`);
            }
        }
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
module.exports.Database = Database;
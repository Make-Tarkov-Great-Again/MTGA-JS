const fs = require('fs');
const { Bot } = require('../models/Bot');
const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const {
    logger, readParsed, fileExist, stringify,
    writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, generateItemId, getAbsolutePathFrom,
    getFileUpdatedDate,
    generateUniqueId } = require('../../utilities');
const database = require('./Database');


class DatabaseLoader {

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
            this.loadCustomization(),
            this.loadLocations() //need help on this @budey
            // Model Data //
        ]);
        await this.loadEditions();
        await this.loadAccounts();
        await this.loadProfiles();
        await this.loadQuests();
        await this.loadPresets();
        await this.loadRagfair();
    }

    /**
    * Loads the core configurations
    */
    static async loadCore() {
        database.core = {
            serverConfig: readParsed(getAbsolutePathFrom(`/database/configs/server.json`)),
            matchMetrics: readParsed(getAbsolutePathFrom(`/database/configs/matchMetrics.json`)),
            globals: readParsed(getAbsolutePathFrom(`/database/configs/globals.json`)).data,
            botTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/botTemplate.json`)),
            traderFleaOfferTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/traderFleaOfferTemplate.json`)),
            playerFleaOfferTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/playerFleaOfferTemplate.json`)),
            botCore: readParsed(getAbsolutePathFrom(`/database/bots/botCore.json`)),
            botNames: readParsed(`./database/bots/botNames.json`),
            clientSettings: readParsed(getAbsolutePathFrom(`/database/configs/client.settings.json`)).data,
            gameplay: readParsed(getAbsolutePathFrom(`/database/configs/gameplay.json`)),
            locations: readParsed(getAbsolutePathFrom(`/database/configs/locations.json`)),
            hideoutSettings: readParsed(getAbsolutePathFrom(`/database/hideout/settings.json`)).data,
            bannedItems: readParsed(getAbsolutePathFrom(`/database/configs/bannedItems.json`))
        };

        const balle = await Bot.generateBots();

        const core = database.core;
        if (core.gameplay.development.updateLocations === true) {
            const directoryTimers = core.serverConfig.directoryTimers;
            const check = await DatabaseUtils.checkDirectoryDates(directoryTimers, true);
            if (check === true) {
                writeFile(getAbsolutePathFrom("/database/configs/server.json"), stringify(serverConfig));
            }
        }
    }

    /**
     * Load hideout data in parallel.
     */
    static async loadHideout() {
        database.hideout = {
            areas: [],
            productions: [],
            scavcase: [],
            settings: []
        };

        let hideoutAreas = readParsed(getAbsolutePathFrom('/database/hideout/areas.json'));
        if (typeof hideoutAreas.data != "undefined") { hideoutAreas = hideoutAreas.data; }
        for (const [index, area] of Object.entries(hideoutAreas)) {
            await UtilityModel.createModelFromParseWithID('HideoutArea', index, area);
        }

        let hideoutProductions = readParsed(getAbsolutePathFrom('/database/hideout/productions.json'));
        if (typeof hideoutProductions.data != "undefined") { hideoutProductions = hideoutProductions.data; }
        for (const [index, production] of Object.entries(hideoutProductions)) {
            if (database.core.gameplay.hideout.fastProduction === true) {
                production.productionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutProduction', production._id, production);
        }


        let hideoutScavcase = readParsed(getAbsolutePathFrom('/database/hideout/scavcase.json'));
        if (typeof hideoutScavcase.data != "undefined") { hideoutScavcase = hideoutScavcase.data; }
        for (const [index, scavcase] of Object.entries(hideoutScavcase)) {
            if (database.core.gameplay.hideout.fastScavcase === true) {
                scavcase.ProductionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutScavcase', scavcase._id, scavcase);
        }
    }


    /**
     * Load weather data in parallel.
     */
    static async loadWeather() {
        database.weather = readParsed(getAbsolutePathFrom('/database/weather.json'))
        if (typeof database.weather.data != "undefined") { database.weather = database.weather.data; }
    }

    /**
     * Load templates data in parallel.
     */
    static async loadTemplates() {
        let templatesData = readParsed(getAbsolutePathFrom('/database/templates.json'))
        if (typeof templatesData.data != "undefined") { templatesData = templatesData.data; }

        database.templates = {
            "Categories": templatesData.Categories,
            "Items": templatesData.Items,
            "PriceTable": await Item.generatePriceTable(templatesData.Items),
            "TplLookup": await DatabaseUtils.generateTplLookup(templatesData.Items, templatesData.Categories)
        };
    }

    static async loadLocations() {
        const gameplay = database.core.gameplay;
        if (gameplay.development.updateLocations === true) {
            const checkForUpdate = await DatabaseUtils.checkDirectoryDates(database.core.serverConfig.directoryTimers);
            if (checkForUpdate === true) {
                await DatabaseUtils.formatAndWriteNewLocationDataToDisk();
            }
        }

        const maps = getDirectoriesFrom(getAbsolutePathFrom('/database/locations'), false);
        for (const map of maps) {
            const location = await UtilityModel.createModelFromParseWithID('Location', map, {});
            const variants = getFilesFrom(getAbsolutePathFrom(`/database/locations/${map}`), false);
            for (const [index, variant] of Object.entries(variants)) {
                const pathData = readParsed(getAbsolutePathFrom(`/database/locations/${map}/${variant}`));
                //const name = variant.replace(".json", "");
                location[index] = await UtilityModel.createModelFromParse(`Location`, pathData);
            }
        }
    }

    static async loadPresets() {
        const presets = await Preset.initialize();
        for (const [index, preset] of Object.entries(presets)) {
            await UtilityModel.createModelFromParseWithID('Preset', index, preset);
        }
    }

    static async loadRagfair() {
        database.ragfair = new Ragfair;
        database.ragfair = await database.ragfair.initialize();
        //writeFile(`./ragfair.json`, stringify(database.ragfair));

    }

    // Load Customization
    static async loadCustomization() {
        const gameplay = database.core.gameplay;
        let customizations = readParsed(getAbsolutePathFrom("/database/customization.json"));
        if (typeof customizations.data != "undefined") customizations = customizations.data;
        for (const [index, customization] of Object.entries(customizations)) {
            if (gameplay.customization.allHeadsOnCharacterCreation === true) {
                if (customization._type != "Node" && customization._props.BodyPart === "Head") {
                    customization._props.Side = ["Bear", "Usec", "Savage"]
                }
            }
            await UtilityModel.createModelFromParseWithID('Customization', index, customization);
        }
    }

    static async loadQuests() {
        let quests = readParsed(getAbsolutePathFrom("/database/quests.json"));
        if (typeof quests.data != "undefined") quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
    }

    // Load Dialogues
    static async loadDialogues() {

    }

    // Load Editions
    static async loadEditions() {
        const editionKeys = getDirectoriesFrom(getAbsolutePathFrom('/database/editions/'), false);
        for (const editionType of editionKeys) {
            const path = getAbsolutePathFrom(`/database/editions/${editionType}/`);
            const edition = await UtilityModel.createModelFromParseWithID('Edition', editionType, {});
            edition.id = editionType;
            edition.bear = await UtilityModel.createModelFromParse("Character", readParsed(`${path}character_bear.json`));
            await edition.bear.solve();
            edition.usec = await UtilityModel.createModelFromParse("Character", readParsed(`${path}character_usec.json`));
            await edition.usec.solve();
            edition.storage = readParsed(`${path}storage.json`);
        }
    }

    // Load Items
    static async loadItems() {
        const gameplay = database.core.gameplay;
        let items = readParsed(getAbsolutePathFrom('/database/items.json'));
        if (typeof items.data != "undefined") { items = items.data; }

        if (gameplay.customization.allPocketsHaveSpecialSlots === true) {
            items = await DatabaseUtils.addSpecialSlotToAllPockets(items);
        }

        for (const [index, item] of Object.entries(items)) {
            await UtilityModel.createModelFromParseWithID('Item', index, item);
        }
    }

    static async loadLanguages() {
        let languages = readParsed(getAbsolutePathFrom(`/database/locales/languages.json`));
        if (typeof languages.data != "undefined") { languages = languages.data; }
        for (const [index, language] of Object.entries(languages)) {
            await UtilityModel.createModelFromParseWithID('Language', language.ShortName, language);
        }
    }

    // Load language
    static async loadLocales() {
        const databaseLocalesPath = getAbsolutePathFrom(`/database/locales/`);
        const localeKeys = getDirectoriesFrom(databaseLocalesPath, false);
        this.locales = {};
        for (const locale in localeKeys) {
            const localeIdentifier = localeKeys[locale];
            const currentLocalePath = `/database/locales/${localeIdentifier}/`;
            if (fileExist(`${currentLocalePath}locale.json`) && fileExist(`${currentLocalePath}menu.json`)) {
                let localeCopy = readParsed(getAbsolutePathFrom(`${currentLocalePath}locale.json`));
                if (typeof localeCopy.data != "undefined") { localeCopy = localeCopy.data; }

                if (database.core.gameplay.customization.allHeadsOnCharacterCreation === true) {
                    localeCopy = await DatabaseUtils.addHeadsToLocale(localeCopy);
                }
                let menuCopy = readParsed(getAbsolutePathFrom(`${currentLocalePath}menu.json`));
                if (typeof menuCopy.data != "undefined") { menuCopy = menuCopy.data; }

                await UtilityModel.createModelFromParseWithID('Locale', localeIdentifier, {
                    locale: localeCopy,
                    menu: menuCopy
                });
            }
        }
    }

    // Load Traders
    static async loadTraders() {
        const databaseTraderPath = getAbsolutePathFrom('/database/traders/');
        const traderKeys = getDirectoriesFrom(databaseTraderPath, false);
        for (const traderID of traderKeys) {
            const path = `/database/traders/${traderID}/`;

            const trader = await UtilityModel.createModelFromParseWithID('Trader', traderID, {});

            if (fileExist(`${path}base.json`)) {
                trader.base = readParsed(getAbsolutePathFrom(`${path}base.json`));
                trader.base.repair.price_rate = null;
            } else {
                trader.base = [];
            }

            if (fileExist(`${path}questassort.json`)) {
                trader.questassort = readParsed(getAbsolutePathFrom(`${path}questassort.json`));
            }

            let assort = readParsed(getAbsolutePathFrom(`${path}assort.json`));
            if (!typeof assort.data === "undefined") {
                assort = assort.data;
            }

            trader.assort = await DatabaseUtils.convertAssortMongoID(assort);

            if (fileExist(`${path}suits.json`)) {
                trader.suits = readParsed(getAbsolutePathFrom(`${path}suits.json`));
            } else {
                trader.suits = [];
            }

            if (fileExist(`${path}dialogue.json`)) {
                trader.dialogue = readParsed(getAbsolutePathFrom(`${path}dialogue.json`));
            } else {
                trader.dialogue = [];
            }

            trader.solve();
        }
    }

    // Account data processing //
    static async loadAccounts() {
        if (!fileExist("/user/profiles/")) {
            createDirectory("/user/profiles/");
        }

        for (const profileID of getDirectoriesFrom(getAbsolutePathFrom('/user/profiles/'), false)) {
            if (fileExist("/user/profiles/" + profileID + "/account.json")) {
                logger.logDebug("[DATABASE][ACCOUNTS] Loading user account " + profileID);

                let account = await UtilityModel.createModelFromParseWithID('Account', profileID, readParsed(getAbsolutePathFrom("/user/profiles/" + profileID + "/account.json")));
                await account.solve();

                const stats = fs.statSync(getAbsolutePathFrom(`/user/profiles/${profileID}/account.json`));
                database.fileAge[profileID] = { account: stats.mtimeMs };
            }
        }
    }

    // Profile data processing //
    static async loadProfiles() {
        for (const profileID of getDirectoriesFrom(getAbsolutePathFrom('/user/profiles'), false)) {
            const profile = await UtilityModel.createModelFromParseWithID("Profile", profileID, {
                character: [],
                storage: {},
                userbuilds: {},
                dialogues: {}
            });
            const path = getAbsolutePathFrom(`/user/profiles/${profileID}/`);
            let stats;

            if (fileExist(`user/profiles/${profileID}/character.json`)) {
                logger.logWarning(`Loading character data for profile ${profileID}`);
                profile.character = await UtilityModel.createModelFromParse("Character", readParsed(`${path}character.json`));
                await profile.character.clearOrphans();
                await profile.character.solve();
                stats = fs.statSync(`${path}character.json`);
                database.fileAge[profileID].character = stats.mtimeMs;
                await profile.save();
            }

            if (fileExist(`user/profiles/${profileID}/storage.json`)) {
                logger.logWarning(`Loading storage data for profile ${profileID}`);
                let parsedStorage = readParsed(`${path}storage.json`);
                if (typeof parsedStorage.data != "undefined") { parsedStorage = parsedStorage.data; }
                profile.storage = parsedStorage;

                stats = fs.statSync(`${path}storage.json`);
                database.fileAge[profileID].storage = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/userbuilds.json`)) {
                logger.logWarning(`Loading userbuilds data for profile ${profileID}`);

                let parsedBuilds = readParsed(`${path}userbuilds.json`);
                if (typeof parsedBuilds.data != "undefined") { parsedBuilds = parsedBuilds.data; }
                profile.userbuilds = await UtilityModel.createCollectionFromParse("Userbuild", parsedBuilds);

                stats = fs.statSync(`${path}userbuilds.json`);
                database.fileAge[profileID].userbuilds = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/dialogue.json`)) {
                logger.logWarning(`Loading dialogue data for profile ${profileID}`);

                let parsedDialogues = readParsed(`${path}dialogue.json`);
                if (typeof parsedDialogues.data != "undefined") { parsedDialogues = parsedDialogues.data; }
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                stats = fs.statSync(`${path}dialogue.json`);
                database.fileAge[profileID].dialogues = stats.mtimeMs;
            }
        }
    }
}


class DatabaseUtils {

    /**
     * Convert all item._id to mongoIDs format.
     * We also need to change the modified parentID to the corresponding mongoID.
     */
    static async convertAssortMongoID(traderAssort) {
        const convertedIds = {};

        // we do a first pass to map old id with MongoID and replace the old id
        for (const item of traderAssort.items) {
            const mongoID = await generateItemId();
            convertedIds[item._id] = mongoID;
            item._id = mongoID;
        }

        // we need to update parentId to their corresponding mongoID
        for (const item of traderAssort.items) {
            if (convertedIds[item.parentId]) {
                item.parentId = convertedIds[item.parentId];
            }
        }

        // we need to update loyal level items
        const newLoyal = {};
        for (let [key, value] of Object.entries(traderAssort.loyal_level_items)) {
            if (convertedIds[key]) {
                key = convertedIds[key];
            }
            newLoyal[key] = value;
        }
        traderAssort.loyal_level_items = newLoyal;


        // we need to update the barter scheme
        const newBarter = {};
        for (let [key, value] of Object.entries(traderAssort.barter_scheme)) {
            if (convertedIds[key]) {
                key = convertedIds[key];
            }
            newBarter[key] = value;
        }
        traderAssort.barter_scheme = newBarter;

        return traderAssort;
    }

    /**
     * Check if the file is older than the last time we checked it
     * If it is, we need to update it it
     * @param {*} serverConfig 
     * @param {*} bool change to true if you want to know if the dates are different or not
     * @returns 
     */
    static async checkDirectoryDates(serverConfig, bool = false) {
        if (!fs.existsSync('./TextAsset')
            || getFilesFrom('./TextAsset').length === 0) { return false; }

        if (typeof serverConfig.TextAsset != "undefined" && bool) {
            const date = getFileUpdatedDate(getAbsolutePathFrom('./TextAsset'));
            if (date > serverConfig.TextAsset) {
                serverConfig.TextAsset = date;
                return serverConfig;
            }
            return serverConfig
        }

        if (typeof serverConfig.TextAsset != "undefined" && !bool) {
            const date = getFileUpdatedDate('./TextAsset');
            if (date > serverConfig.TextAsset) {
                serverConfig.TextAsset = date;
                return true;
            }
            return false;
        }
    }

    static async changeFileExtensionOnTextAssetLocations() {
        const filenames = getFilesFrom('./TextAsset');
        let files = [];
        for (const file of filenames) {

            if (file.endsWith('.json')) continue;
            const path = getAbsolutePathFrom(`./TextAsset/${file}`);

            const txtStats = getFileUpdatedDate(path)
            let jsonStats;
            const check = file.replace('.txt', '.json');
            if (fileExist(`./TextAsset/${check}`)) {
                jsonStats = getFileUpdatedDate(`./TextAsset/${check}`)
            }
            if (jsonStats != null && jsonStats < txtStats) {
                const changeFileExtension = path.replace('.txt', '.json')
                fs.rename(path, changeFileExtension, (err) => {
                    if (err) {
                        logger.logError(
                            `Error renaming ${path}`
                        );
                    }
                });
                files.push(check)
            } else {
                continue;
            }
        }
        return files;
    }

    static async formatAndWriteNewLocationDataToDisk() {
        logger.logWarning("Loading new locations into proper format...");

        const files = await this.changeFileExtensionOnTextAssetLocations();
        if (files.length > 0) {
            for (let file of files) {
                const path = getAbsolutePathFrom(`./TextAsset/${file}`);
                if (file.includes("hideout") || file.includes("develop")) continue;

                let directoryName;
                if (!file.includes("factory4")) {
                    directoryName = file.replace('.json', '').replace(/\d+/g, '').toLowerCase();
                } else {
                    directoryName = file.replace('.json', '').replace(/\d+/g, '').replace('factory', 'factory4').toLowerCase();
                }

                let locationsDirectory;
                if (fileExist(`./database/locations`)) {
                    locationsDirectory = `./database/locations/`;
                } else {
                    fs.mkdirSync(`./database/locations`);
                    locationsDirectory = `./database/locations/`;
                }

                let locationPath;
                if (!fileExist(`./database/locations/${directoryName}`)) {
                    locationPath = `${locationsDirectory}${directoryName}`;
                    fs.mkdirSync(locationPath);
                } else {
                    locationPath = `${locationsDirectory}${directoryName}`;
                }

                let uppercase;
                let filename;
                if (file.includes("RezervBase")) {
                    uppercase = "RezervBase";
                    filename = file.replace(directoryName, '').replace(".json", "").replace(uppercase, "");
                } else {
                    uppercase = directoryName.charAt(0).toUpperCase() + directoryName.slice(1);
                    filename = file.replace(directoryName, '').replace(".json", "").replace(uppercase, "");
                }

                if (fileExist(`${locationPath}/${filename}.json`)) {
                    const map = readParsed(path);
                    let location = map
                    if (typeof map.Location != "undefined") { location = map.Location; }
                    console.log(`${directoryName}${filename}`);
                    writeFile(locationPath + `/${filename}.json`, stringify(location));
                }
            }
        }
    }

    static async addSpecialSlotToAllPockets(items) {
        for (const item in items) {
            if (items[item]._parent === "557596e64bdc2dc2118b4571") {
                if (items[item]._props.Slots) {
                    items[item]._props.Slots = [
                        {
                            "_name": "SpecialSlot1",
                            "_id": generateUniqueId,
                            "_parent": items[item]._id,
                            "_props": {
                                "filters": [
                                    {
                                        "Filter": [
                                            "5f4fbaaca5573a5ac31db429",
                                            "5f4f9eb969cdc30ff33f09db",
                                            "61605ddea09d851a0a0c1bbc",
                                            "61605e13ffa6e502ac5e7eef",
                                            "5991b51486f77447b112d44f",
                                            "5ac78a9b86f7741cca0bbd8d",
                                            "5b4391a586f7745321235ab2",
                                            "544fb5454bdc2df8738b456a"
                                        ]
                                    }
                                ]
                            },
                            "_required": false,
                            "_mergeSlotWithChildren": false,
                            "_proto": "55d721144bdc2d89028b456f"
                        },
                        {
                            "_name": "SpecialSlot2",
                            "_id": generateUniqueId,
                            "_parent": items[item]._id,
                            "_props": {
                                "filters": [
                                    {
                                        "Filter": [
                                            "5f4fbaaca5573a5ac31db429",
                                            "5f4f9eb969cdc30ff33f09db",
                                            "61605ddea09d851a0a0c1bbc",
                                            "61605e13ffa6e502ac5e7eef",
                                            "5991b51486f77447b112d44f",
                                            "5ac78a9b86f7741cca0bbd8d",
                                            "5b4391a586f7745321235ab2",
                                            "544fb5454bdc2df8738b456a"
                                        ]
                                    }
                                ]
                            },
                            "_required": false,
                            "_mergeSlotWithChildren": false,
                            "_proto": "55d721144bdc2d89028b456f"
                        },
                        {
                            "_name": "SpecialSlot3",
                            "_id": generateUniqueId,
                            "_parent": items[item]._id,
                            "_props": {
                                "filters": [
                                    {
                                        "Filter": [
                                            "5f4fbaaca5573a5ac31db429",
                                            "5f4f9eb969cdc30ff33f09db",
                                            "61605ddea09d851a0a0c1bbc",
                                            "61605e13ffa6e502ac5e7eef",
                                            "5991b51486f77447b112d44f",
                                            "5ac78a9b86f7741cca0bbd8d",
                                            "5b4391a586f7745321235ab2",
                                            "544fb5454bdc2df8738b456a"
                                        ]
                                    }
                                ]
                            },
                            "_required": false,
                            "_mergeSlotWithChildren": false,
                            "_proto": "55d721144bdc2d89028b456f"
                        }
                    ]
                }
            }
        }
        return items;
    }

    static async addHeadsToLocale(locales) {
        const extraHeads = readParsed(`./database/locales/extras.json`)
        for (let [key, value] of Object.entries(extraHeads.templates)) {
            if (typeof locales.templates[key] != "undefined") {
                locales.templates[key] = value;
            } else {
                locales.templates[key] = value;
            }
        }
        for (let [key, value] of Object.entries(extraHeads.customization)) {
            if (typeof locales.customization[key] != "undefined") {
                locales.customization[key] = value;
            } else {
                locales.customization[key] = value;
            }
        }

        return locales;
    }

    static async generateTplLookup(items, categories) {
        const lookup = {
            items: {
                byId: {},
                byParent: {},
            },
            categories: {
                byId: {},
                byParent: {},
            },
        };

        for (let x of items) {
            lookup.items.byId[x.Id] = x.Price;
            lookup.items.byParent[x.ParentId] || (lookup.items.byParent[x.ParentId] = []);
            lookup.items.byParent[x.ParentId].push(x.Id);
        }

        for (let x of categories) {
            lookup.categories.byId[x.Id] = x.ParentId ? x.ParentId : null;
            if (x.ParentId) {
                // root as no parent
                lookup.categories.byParent[x.ParentId] || (lookup.categories.byParent[x.ParentId] = []);
                lookup.categories.byParent[x.ParentId].push(x.Id);
            }
        }
        return lookup;
    }
}

module.exports.DatabaseLoader = DatabaseLoader;

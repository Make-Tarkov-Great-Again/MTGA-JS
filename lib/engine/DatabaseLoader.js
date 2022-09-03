const fs = require('fs');
const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const { ItemNode } = require('../models/ItemNode');
const { BotUtilities } = require('../models/Bot');

const {
    logger, readParsed, fileExist, stringify, writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, getCurrentTimestamp, getAbsolutePathFrom, getFileUpdatedDate, generateMongoID,
    read, parse } = require('../../utilities');
const database = require('./Database');


class DatabaseLoader {

    static async setDatabase() {

        logger.log("Generating database!");
        // generate database
        await Promise.allSettled([
            this.generateCore(),
            this.generateItems(),
            this.generateHideout(),
            this.generateWeather(),
            this.generateLanguages(),
            this.generateLocales(),
            this.generateTemplates(),
            this.generateTraders(),
            this.generateCustomization(),
            this.generateLocations(),
            this.generateQuests()
        ]);

        // generate after preliminary database is generated
        await Promise.allSettled([
            this.generateBots(),
            this.generateEditions(),
            this.generateAccounts(),
            this.generateProfiles(),
            this.generatePresets(),
            this.generateRagfair(),
            this.generateItemNode()
        ]);

        //await DatabaseUtils.generateRarityForItems();
        logger.log("Database generated!");
    }

    static async generateCore() {
        database.core = {
            serverConfig: readParsed(getAbsolutePathFrom(`/database/configs/server.json`)),
            matchMetrics: readParsed(getAbsolutePathFrom(`/database/configs/matchMetrics.json`)),
            globals: readParsed(getAbsolutePathFrom(`/database/configs/globals.json`)).data,
            botTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/botTemplate.json`)),
            traderFleaOfferTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/traderFleaOfferTemplate.json`)),
            playerFleaOfferTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/playerFleaOfferTemplate.json`)),
            clientSettings: readParsed(getAbsolutePathFrom(`/database/configs/client.settings.json`)).data,
            gameplay: readParsed(getAbsolutePathFrom(`/database/configs/gameplay.json`)),
            locations: readParsed(getAbsolutePathFrom(`/database/configs/locations.json`)),
            hideoutSettings: readParsed(getAbsolutePathFrom(`/database/hideout/settings.json`)).data,
            blacklist: readParsed(getAbsolutePathFrom(`/database/configs/blacklist.json`)),
            rarity: readParsed("./rarity.json")
        };

        const core = database.core;
        if (core.gameplay.development.updateLocations === true) {
            const directoryTimers = core.serverConfig.directoryTimers;
            const check = await DatabaseUtils.checkDirectoryDates(directoryTimers, true);
            if (check === true) {
                writeFile(getAbsolutePathFrom("/database/configs/server.json"), stringify(serverConfig));
            }
        }
    }

    static async generateBots() {
        database.bot = {
            names: readParsed(`./database/bot/names.json`),
            core: readParsed(`./database/bot/__BotGlobalSettings.json`),
            appearance: readParsed("./database/bot/appearance.json")
        };

        database.bot.bots = {};
        const botType = getDirectoriesFrom(`./database/bot/bots`);
        for (const bot of botType) {
            database.bot.bots[bot] = {
                difficulty: {}
            };

            if (fileExist(`./database/bot/bots/${bot}/health.json`)) {
                database.bot.bots[bot].health = {};
                const health = readParsed(`./database/bot/bots/${bot}/health.json`);
                if (Object.keys(health).length > 0) {
                    for (const [index, value] of Object.entries(health)) {
                        database.bot.bots[bot].health[index] = value;
                    }
                } else database.bot.bots[bot].health = health;
            }
            if (fileExist(`./database/bot/bots/${bot}/loadout.json`)) {
                database.bot.bots[bot].authorizedGear = readParsed(`./database/bot/bots/${bot}/loadout.json`);
                database.bot.bots[bot].weightedGear = await DatabaseUtils.generateWeightedList(database.bot.bots[bot].authorizedGear);
            }

            const botDifficulty = getFilesFrom(`./database/bot/bots/${bot}/difficulties`);
            for (const difficulty of botDifficulty) {
                database.bot.bots[bot].difficulty[difficulty.replace(".json", "")] = readParsed(`./database/bot/bots/${bot}/difficulties/${difficulty}`);
            }
        }
    }

    static async generateHideout() {
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

    static async generateWeather() {
        database.weather = readParsed(getAbsolutePathFrom('/database/weather.json'))
        if (typeof database.weather.data != "undefined") { database.weather = database.weather.data; }
    }

    static async generateTemplates() {
        let templatesData = readParsed(getAbsolutePathFrom('/database/templates.json'));
        if (typeof templatesData.data != "undefined") { templatesData = templatesData.data; }
        database.templates = {
            "Categories": templatesData.Categories,
            "Items": templatesData.Items,
            "PriceTable": await Item.generatePriceTable(templatesData.Items),
            "TplLookup": await DatabaseUtils.generateTplLookup(templatesData.Items, templatesData.Categories)
        };
    }

    static async generateLocations() {
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
                location[index] = await UtilityModel.createModelFromParse(`Location`, pathData);
            }
        }
    }

    static async generatePresets() {
        const presets = await Preset.initialize();
        for (const [index, preset] of Object.entries(presets)) {
            await UtilityModel.createModelFromParseWithID('Preset', index, preset);
        }
    }

    static async generateRagfair() {
        const ragfairData = await Ragfair.initialize();
        await UtilityModel.createModelFromParseWithID('Ragfair', 'FleaMarket', ragfairData);
    }

    static async generateCustomization() {
        const gameplay = database.core.gameplay;
        let customizations = readParsed(getAbsolutePathFrom("/database/customization.json"));
        if (typeof customizations.data != "undefined") customizations = customizations.data;
        for (const [index, customization] of Object.entries(customizations)) {
            if (gameplay.customization.allHeadsOnCharacterCreation === true) {
                if (customization._type !== "Node" && customization._props.BodyPart === "Head") {
                    customization._props.Side = ["Bear", "Usec", "Savage"];
                }
            }
            if (gameplay.customization.allVoicesOnCharacterCreation === true) {
                if (customization._type !== "Node" && customization._parent === "5fc100cf95572123ae738483") {
                    customization._props.Side = ["Bear", "Usec", "Savage"];
                }
            }
            await UtilityModel.createModelFromParseWithID('Customization', index, customization);
        }
    }

    static async generateQuests() {
        let quests = readParsed(getAbsolutePathFrom("/database/quests.json"));
        if (typeof quests.data != "undefined") quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
    }

    static async loadDialogues() {
        return "your mom gay";
    }

    static async generateEditions() {
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

    static async generateItems() {
        const gameplay = database.core.gameplay;
        let items = readParsed(getAbsolutePathFrom('/database/items.json'));
        if (typeof items.data != "undefined") { items = items.data; }


        for (const [index, item] of Object.entries(items)) {
            if (gameplay.items.stackSize.ammo) {
                if (item._parent === "5485a8684bdc2da71d8b4567") {
                    item._props.StackMaxSize = gameplay.items.stackSize.ammo;
                }
            }

            if (gameplay.customization.allPocketsHaveSpecialSlots) {
                if (item._parent === "557596e64bdc2dc2118b4571" && item._props.Slots) {
                    item._props.Slots = await DatabaseUtils.createSpecialSlots(item);
                }
            }

            if (gameplay.items.quickExamine) {
                if (item._props.ExamineTime) {
                    item._props.ExamineTime = 0;
                }
            }

            if (gameplay.items.allExamined.enabled) {
                if (!gameplay.items.allExamined.exceptTheseParent.includes(item._parent)) {
                    if (!item._props.ExaminedByDefault) {
                        item._props.ExaminedByDefault = true;
                    }
                }
            }

            if (gameplay.items.stackSize.money) {
                if (item._parent === "543be5dd4bdc2deb348b4569") {
                    item._props.StackMaxSize = gameplay.items.stackSize.money;
                }
            }

            if (gameplay.items.stimMaxUses) {
                if (item._parent === "5448f3a14bdc2d27728b4569" && item._props.ItemSound === "med_stimulator" || item._parent === "5448f3a64bdc2d60728b456a") {
                    item._props.MaxHpResource = gameplay.items.stimMaxUses;
                }
            }
            await UtilityModel.createModelFromParseWithID('Item', index, item);
        }
    }

    static async generateLanguages() {
        let languages = readParsed(getAbsolutePathFrom(`/database/locales/languages.json`));
        if (typeof languages.data != "undefined") { languages = languages.data; }
        for (const [index, language] of Object.entries(languages)) {
            await UtilityModel.createModelFromParseWithID('Language', language.ShortName, language);
        }
    }

    static async generateLocales() {
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
                if (database.core.gameplay.customization.allVoicesOnCharacterCreation === true) {
                    localeCopy = await DatabaseUtils.addVoicesToLocale(localeCopy);
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

    static async generateTraders() {
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
            const currentTime = await getCurrentTimestamp();
            await trader.generateAssort(currentTime);

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

    static async generateAccounts() {
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

    static async generateProfiles() {
        for (const profileID of getDirectoriesFrom(getAbsolutePathFrom('/user/profiles'), false)) {
            const profile = await UtilityModel.createModelFromParseWithID("Profile", profileID, {
                character: [],
                storage: {},
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
                logger.logWarning(`Loading storage data for profile: ${profileID}`);
                let parsedStorage = readParsed(`${path}storage.json`);
                if (typeof parsedStorage.data != "undefined") { parsedStorage = parsedStorage.data; }
                profile.storage = parsedStorage;

                stats = fs.statSync(`${path}storage.json`);
                database.fileAge[profileID].storage = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/dialogue.json`)) {
                logger.logWarning(`Loading dialogue data for profile: ${profileID}`);

                let parsedDialogues = readParsed(`${path}dialogue.json`);
                if (typeof parsedDialogues.data != "undefined") { parsedDialogues = parsedDialogues.data; }
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                stats = fs.statSync(`${path}dialogue.json`);
                database.fileAge[profileID].dialogues = stats.mtimeMs;
            }
        }
    }

    static async generateItemNode() {
        const listNodesFromItems = await Item.getAllItemsNodes();
        for (const nodeInfo of listNodesFromItems) {
            if (["Item", "SpecialWeapon"].includes(nodeInfo._name)) {
                continue;
            }
            const node = {
                id: nodeInfo._id,
                name: nodeInfo._name,
                parent: nodeInfo._parent,
                childrens: []
            };
            await UtilityModel.createModelFromParseWithID("ItemNode", node.id, node);
        }
        const nodeModels = await ItemNode.getAllWithoutKeys();
        for (const nodeModel of nodeModels) {
            await nodeModel.generateChildrensList();
        }
    }
}


class DatabaseUtils {

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

    static async changeFileExtensionOnTextAsset() {
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
            if (jsonStats != null && jsonStats < txtStats ||
                !fileExist(`./TextAsset/${check}`)) {
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

        const files = await this.changeFileExtensionOnTextAsset();
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
                    //clean up trailing commas, thanks BSG
                    const input = read(path).toString();
                    const output = input.replace(/(?<=(true|false|null|["\d}\]])\s*),(?=\s*[}\]])/g, '');
                    const map = parse(output);
                    let location = map
                    if (typeof map.Location != "undefined") { location = map.Location; }
                    logger.logConsole(`${directoryName}${filename}`);
                    writeFile(locationPath + `/${filename}.json`, stringify(location));
                }
            }
        }
    }

    static async formatAndWriteNewBotDifficultyDataToDisk() {
        let files = await this.changeFileExtensionOnTextAsset();
        if (files.length == 0) files = getFilesFrom('./TextAsset');
        if (files.length > 0) {
            for (let file of files) {
                const path = getAbsolutePathFrom(`./TextAsset/${file}`);

                const botDirectory = `./database/bot`;
                if (!fileExist(botDirectory)) {
                    fs.mkdirSync(botDirectory);
                }

                if (file.includes('__BotGlobalSettings.json')) {
                    const data = readParsed(path);
                    writeFile(`${botDirectory}/${file}`, stringify(data));
                }

                const botTypeDirectory = `${botDirectory}/bots`;
                if (!fileExist(botTypeDirectory)) {
                    fs.mkdirSync(botTypeDirectory);
                }

                const nickname = file.replace("_BotGlobalSettings.json", "");
                const keys = nickname.split('_');

                const aiDirectory = `${botTypeDirectory}/${keys[1]}`;
                if (!fileExist(aiDirectory)) {
                    fs.mkdirSync(aiDirectory);
                }
                const aiDifficultyDirectory = `${aiDirectory}/difficulties`;
                if (!fileExist(aiDifficultyDirectory)) {
                    fs.mkdirSync(aiDifficultyDirectory);
                }

                //clean up trailing commas, thanks BSG
                const input = read(path).toString();
                const output = input.replace(/(?<=(true|false|null|["\d}\]])\s*),(?=\s*[}\]])/g, '');
                const difficultyData = parse(output);
                writeFile(`${aiDifficultyDirectory}/${keys[0]}.json`, stringify(difficultyData));

            }
        }
    }

    static async createSpecialSlots(item) {
        return [
            {
                "_name": "SpecialSlot1",
                "_id": await generateMongoID(),
                "_parent": item._id,
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
                "_id": await generateMongoID(),
                "_parent": item._id,
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
                "_id": await generateMongoID(),
                "_parent": item._id,
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

    static async addVoicesToLocale(locales) {
        const extraVoices = readParsed(`./database/locales/extras.json`)
        for (let [key, value] of Object.entries(extraVoices.customization.Voices)) {
            locales.customization[key] = value;
        }
        return locales;
    }

    static async addHeadsToLocale(locales) {
        const extraHeads = readParsed(`./database/locales/extras.json`);
        for (let [key, value] of Object.entries(extraHeads.templates)) {
            locales.templates[key] = value;
        }
        for (let [key, value] of Object.entries(extraHeads.customization.Heads)) {
            locales.customization[key] = value;
        }
        return locales;
    }

    /**
     * Generate a correspondance object between items and ragfair categories, ragfair main categories and ragfair sub categories, I don't like this, I want to delete it.
     * @param {object} items
     * @param {object} categories
     * @returns {object} correspondance object
     */
    static async generateTplLookup(items, categories) {
        const lookup = {
            items: {
                byId: {},
                byParent: {}
            },
            categories: {
                byId: {},
                byParent: {}
            }
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

    static async generateCategorizedCustomization() {
        let customizations = readParsed(getAbsolutePathFrom("/database/customization.json"));
        if (typeof customizations.data != "undefined") customizations = customizations.data;

        const appearance = readParsed(getAbsolutePathFrom("/database/bot/appearance.json"));
        const random = appearance.random;

        for (const [index, customization] of Object.entries(customizations)) {

            if (customization._type == "Node") continue;

            if (customization._type != "Node" && customization._props.BodyPart === "Head") {
                random.Head.push(index);
                continue;
            }

            if (customization._type != "Node" && customization._props.BodyPart === "Body") {
                random.Body.push(index);
                continue;
            }

            if (customization._type != "Node" && customization._props.BodyPart === "Feet") {
                random.Feet.push(index);
                continue;
            }

            if (customization._type != "Node" && customization._props.BodyPart === "Hands") {
                random.Hands.push(index);
                continue;
            }

            if (customization._parent == "5fc100cf95572123ae738483") {
                random.Voice.push(index);
            }
        }

        writeFile("/database/bot/appearance.json", stringify(appearance));
    }

    static async generateRarityForItems() {
        const rarity = readParsed(getAbsolutePathFrom("./rarity.json"));
        const liveFleaPrices = readParsed(getAbsolutePathFrom("./prices.json"));
        /* 
        const knife = await ItemNode.getNodeChildrenByName("Knife");
        for (const item of knife) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 6000 && liveFleaPrices[item._id] > 1:
                        rarity.Scabbard.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 13000 && liveFleaPrices[item._id] >= 6000:
                        rarity.Scabbard.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 50000 && liveFleaPrices[item._id] > 13000:
                        rarity.Scabbard.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 50000:
                        rarity.Scabbard.Superrare.push(item._id);
                        break;
                }
            }
        } 
    
        const vest = await ItemNode.getNodeChildrenByName("Vest");
        for (const item of vest) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 17500 && liveFleaPrices[item._id] > 1:
                        rarity.Vest.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 25000 && liveFleaPrices[item._id] >= 17500:
                        rarity.Vest.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 42500 && liveFleaPrices[item._id] > 25000:
                        rarity.Vest.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 42500:
                        rarity.Vest.Superrare.push(item._id);
                        break;
                }
            }
        }
        
    
        const armor = await ItemNode.getNodeChildrenByName("Armor");
        for (const item of armor) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 37500 && liveFleaPrices[item._id] > 1:
                        rarity.ArmorVest.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 70000 && liveFleaPrices[item._id] >= 37500:
                        rarity.ArmorVest.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 150000 && liveFleaPrices[item._id] > 70000:
                        rarity.ArmorVest.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 150000:
                        rarity.ArmorVest.Superrare.push(item._id);
                        break;
                }
            }
        }
        
        const headwears = await ItemNode.getNodeChildrenByName("Headwear");
        for (const item of headwears) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 17500 && liveFleaPrices[item._id] > 1:
                        rarity.Headwear.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 37500 && liveFleaPrices[item._id] >= 17500:
                        rarity.Headwear.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 62500 && liveFleaPrices[item._id] > 37500:
                        rarity.Headwear.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 62500:
                        rarity.Headwear.Superrare.push(item._id);
                        break;
                }
            }
        }
        
        const backpacks = await ItemNode.getNodeChildrenByName("Backpack");
        for (const item of backpacks) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 17500 && liveFleaPrices[item._id] > 1:
                        rarity.Backpack.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 37500 && liveFleaPrices[item._id] >= 17500:
                        rarity.Backpack.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 62500 && liveFleaPrices[item._id] > 37500:
                        rarity.Backpack.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 62500:
                        rarity.Backpack.Superrare.push(item._id);
                        break;
                }
            }
        }
        
        const eyewears = await ItemNode.getNodeChildrenByName("Visors");
        for (const item of eyewears) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 9000 && liveFleaPrices[item._id] > 1:
                        rarity.Eyewear.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 19000 && liveFleaPrices[item._id] >= 9000:
                        rarity.Eyewear.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 30000 && liveFleaPrices[item._id] > 19000:
                        rarity.Eyewear.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 30000:
                        rarity.Eyewear.Superrare.push(item._id);
                        break;
                }
            }
        }
        
        const headphones = await ItemNode.getNodeChildrenByName("Headphones");
        for (const item of headphones) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 20000 && liveFleaPrices[item._id] > 1:
                        rarity.Earpiece.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 27500 && liveFleaPrices[item._id] >= 20000:
                        rarity.Earpiece.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 36000 && liveFleaPrices[item._id] > 27500:
                        rarity.Earpiece.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 36000:
                        rarity.Earpiece.Superrare.push(item._id);
                        break;
                }
            }
        }
        
        const facecovers = await ItemNode.getNodeChildrenByName("FaceCover");
        for (const item of facecovers) {
            if (liveFleaPrices[item._id]) {
                switch (true) {
                    case liveFleaPrices[item._id] < 10000 && liveFleaPrices[item._id] > 1:
                        rarity.FaceCover.Common.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 17500 && liveFleaPrices[item._id] >= 10000:
                        rarity.FaceCover.Uncommon.push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 30000 && liveFleaPrices[item._id] > 17500:
                        rarity.FaceCover.Rare.push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 30000:
                        rarity.FaceCover.Superrare.push(item._id);
                        break;
                }
            }
        }
        
    
        const weapons = await ItemNode.getNodeChildrenByName("Weapon");
        for (const category of weapons) {
            const guns = category.childrens;
            for (const gun of guns) {
                if (liveFleaPrices[gun._id]) {
                    switch (true) {
                        case liveFleaPrices[gun._id] < 15000 && liveFleaPrices[gun._id] > 1:
                            rarity.Weapon[category.name].Common.push(gun._id);
                            break;
                        case liveFleaPrices[gun._id] < 22500 && liveFleaPrices[gun._id] >= 15000:
                            rarity.Weapon[category.name].Uncommon.push(gun._id);
                            break;
                        case liveFleaPrices[gun._id] < 40000 && liveFleaPrices[gun._id] > 22500:
                            rarity.Weapon[category.name].Rare.push(gun._id);
                            break;
                        case liveFleaPrices[gun._id] > 40000:
                            rarity.Weapon[category.name].Superrare.push(gun._id);
                            break;
                    }
                }
            }
        }
        
        const ammo = await ItemNode.getNodeChildrenByName("Ammo");
        // _parent === ammo, and _props.Caliber;
        // Ammo[Caliber] = {Common:[], Uncommon:[], Rare:[], Superrare:[]};
        // if _name.includes("shrapnel"), skip it
        for (const item of ammo) {
            if (liveFleaPrices[item._id] && !item._name.includes("shrapnel")) {
                if (!rarity.Ammo) rarity.Ammo = {};
                if (!rarity.Ammo[item._props.Caliber]) rarity.Ammo[item._props.Caliber] = {};
                if (!rarity.Ammo[item._props.Caliber].Common) rarity.Ammo[item._props.Caliber].Common = [];
                if (!rarity.Ammo[item._props.Caliber].Uncommon) rarity.Ammo[item._props.Caliber].Uncommon = [];
                if (!rarity.Ammo[item._props.Caliber].Rare) rarity.Ammo[item._props.Caliber].Rare = [];
                if (!rarity.Ammo[item._props.Caliber].Superrare) rarity.Ammo[item._props.Caliber].Superrare = [];
    
    
                switch (true) {
                    case liveFleaPrices[item._id] < 75 && liveFleaPrices[item._id] > 1:
                        rarity.Ammo[item._props.Caliber]["Common"].push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 200 && liveFleaPrices[item._id] >= 75:
                        rarity.Ammo[item._props.Caliber]["Uncommon"].push(item._id);
                        break;
                    case liveFleaPrices[item._id] < 400 && liveFleaPrices[item._id] > 200:
                        rarity.Ammo[item._props.Caliber]["Rare"].push(item._id);
                        break;
                    case liveFleaPrices[item._id] > 400:
                        rarity.Ammo[item._props.Caliber]["Superrare"].push(item._id);
                        break;
                }
            }
        }
        */
        writeFile("./rarity.json", stringify(rarity));
    }

    static async generateWeightedList(authorizedGear) {
        const finalResult = [];
        for (const gearCateg in authorizedGear) {
            // retrieve all prices of items in categ
            const itemsWithPrices = [];
            for (const item of authorizedGear[gearCateg]) {
                itemsWithPrices.push({itemId: [item], price: await Item.getItemPrice(item)});
            }
            // retrieve the total prices of all items in categ
            let totalPrice = 0;
            for (const item of itemsWithPrices) {
                totalPrice += item.price;
            }
            // retrieve percentage of price on totalPrice for item
            const percentageList = [];
            for (const item of itemsWithPrices) {
                percentageList[item.itemId] = Math.round(item.price / totalPrice * 100);
            }
            // invert percentage: high percentage cost of totalPrice become low weight
            const invertedWeight = [];
            const keys = Object.keys(percentageList);
            const values = Object.values(percentageList);
            let j = 0;
            for (let i=values.length -1; i >= 0; i--) {
                invertedWeight.push({[keys[j]]: values[i]});
                j += 1;
            }
            finalResult.push({[gearCateg]: invertedWeight});
        }
        return finalResult;
    }
}

module.exports.DatabaseLoader = DatabaseLoader;

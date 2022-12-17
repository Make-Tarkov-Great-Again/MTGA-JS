const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const { Bot } = require('../models/Bot');
const { ItemNode } = require('../models/ItemNode');

const {
    logger, readParsed, fileExist, stringify,
    writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, getCurrentTimestamp,
    generateMongoID, getFileUpdatedDate } = require('../utilities');

const opener = require("opener");
const { tasker, database } = require('../../app');


class DatabaseLoader {
    static async setDatabase() {
        await Promise.allSettled([
            this.generateCore(),
            this.generateItems(),
            this.generateTemplates(),
            this.generateHideout(),
            this.generateWeather(),
            this.generateLanguages(),
            this.generateLocales(),
            this.generateTraders(),
            this.generateCustomization(),
            this.generateLocations(),
            this.generateQuests()
        ])
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));
        await Promise.allSettled([
            this.generateBots(),
            this.generateEditions(),
            this.generateAccounts(),
            this.generateProfiles(),
            this.generatePresets(),
            this.generateRagfair(),
            this.generateItemNode()
        ])
            //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));
            .then(() => {
                if (database.core.gameplay.bots.preload.enabled) {
                    database.bot.preload = Bot.initializeBotPreload();
                    if (database.core.gameplay.development.debugBots) {
                        writeFile("./bots.json", stringify(database.bot.preload))
                    }
                }

                if (database.core.gameplay.development.openWebLauncher) {
                    logger.success(`

                Opening web-based Launcher in 3 seconds...
                
                `)
                    setTimeout(() => {
                        opener(`https://${database.core.serverConfig.ip}:${database.core.serverConfig.port}`)
                    }, 3000);
                }
            })

    }

    static async generateCore() {
        await this.adjustGlobals(database.core.globals, database.core.gameplay);
        // await logger.success("Global Database Loaded")

    }

    static async adjustGlobals(globals, gameplay) {
        const config = globals.config;

        //flea
        config.RagFair.enabled = gameplay.trading.flea.enabled;
        config.RagFair.minUserLevel = gameplay.trading.flea.minUserLevel;
        config.handbook.defaultCategory = "";

        //raid
        [config.TimeBeforeDeploy, config.TimeBeforeDeployLocal] = [gameplay.raid.timeBeforeDeploy, gameplay.raid.timeBeforeDeploy]

        //bots
        config.MaxBotsAliveOnMap = gameplay.raid.maxBotsAliveOnMap;
        [config.WAVE_COEF_LOW, config.WAVE_COEF_MID, config.WAVE_COEF_HIGH, config.WAVE_COEF_HORDE] =
            [
                gameplay.raid.waveCoef.low,
                gameplay.raid.waveCoef.mid,
                gameplay.raid.waveCoef.high,
                gameplay.raid.waveCoef.horde
            ]
        globals.HealthEffect = null;
    }

    static async generateBots() {
        database.bot = {
            names: await readParsed(`./assets/database/bot/names.json`),
            core: await readParsed(`./assets/database/bot/__BotGlobalSettings.json`),
            appearance: await readParsed("./assets/database/bot/appearance.json"),
            playerScav: await readParsed("./assets/database/bot/playerScav.json"),
            weaponCache: await readParsed(`./assets/database/bot/weaponCache.json`)
        };

        database.bot.bots = {};
        const botDirectory = await getDirectoriesFrom(`./assets/database/bot/bots`, false);
        for (const bot of botDirectory) {
            database.bot.bots[bot] = {
                difficulty: {}
            };

            const path = `./assets/database/bot/bots/${bot}`

            if (await fileExist(`${path}/health.json`)) {
                database.bot.bots[bot].health = {};
                const health = await readParsed(`${path}/health.json`);
                if (Object.keys(health).length > 0) {
                    for (const [index, value] of Object.entries(health)) {
                        database.bot.bots[bot].health[index] = value;
                    }
                } else database.bot.bots[bot].health = health;
            }
            if (await fileExist(`${path}/loadout.json`)) {
                database.bot.bots[bot].authorizedGear = await readParsed(`${path}/loadout.json`);
                database.bot.bots[bot].weightedGear = await Item.createWeightedList(database.bot.bots[bot].authorizedGear);
            }

            const botDifficulty = await getFilesFrom(`${path}/difficulties`);
            for (const difficulty of botDifficulty) {
                database.bot.bots[bot].difficulty[difficulty.replace(".json", "")] = await readParsed(`${path}/difficulties/${difficulty}`);
            }
        }
        // await logger.success("Bot Database Loaded")

    }

    static async generateHideout() {
        /*         database.hideout = {
                    areas: [],
                    productions: [],
                    scavcase: []
                };
         */
        const path = `./assets/database/hideout/`;

        let hideoutAreas = await readParsed(`${path}areas.json`);
        if (hideoutAreas.data) { hideoutAreas = hideoutAreas.data; }
        for (const [index, area] of Object.entries(hideoutAreas)) {
            await UtilityModel.createModelFromParseWithID('HideoutArea', index, area);
        }

        let hideoutProductions = await readParsed(`${path}productions.json`);
        if (hideoutProductions.data) { hideoutProductions = hideoutProductions.data; }
        for (const production of Object.values(hideoutProductions)) {
            if (database.core.gameplay.hideout.fastProduction === true) {
                production.productionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutProduction', production._id, production);
        }

        let hideoutScavcase = await readParsed(`${path}scavcase.json`);
        if (hideoutScavcase.data) { hideoutScavcase = hideoutScavcase.data; }
        for (const scavcase of Object.values(hideoutScavcase)) {
            if (database.core.gameplay.hideout.fastScavcase === true) {
                scavcase.ProductionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutScavcase', scavcase._id, scavcase);
        }
        // await logger.success("Hideout Database Loaded")

    }

    static async generateWeather() {
        database.weather = await readParsed('./assets/database/weather.json')
        if (database.weather.data) { database.weather = database.weather.data; }
        // await logger.success("Weather Database Loaded")

    }

    static async generateTemplates() {
        let template = await readParsed('./assets/database/templates.json');
        if (template.data) { template = template.data; }
        database.templates = {}

        database.templates.Categories = template.Categories;
        database.templates.Items = template.Items;
        database.templates.priceTable = await Item.generatePriceTable(template.Items);
        database.templates.TplLookup = await DatabaseUtils.generateTplLookup(template.Items, template.Categories);

        // await logger.success("Template Database Loaded")
    }

    static async generateLocations() {
        const mapDirectory = await getDirectoriesFrom(`./assets/database/locations/`, false);

        for (const map of mapDirectory) {
            const path = `./assets/database/locations/${map}`

            const location = await UtilityModel.createModelFromParseWithID('Location', map, {});
            const variants = await getFilesFrom(path);
            for (const [index, variant] of Object.entries(variants)) {
                let pathData = await readParsed(`${path}/${variant}`);
                if (pathData.Location) pathData = pathData.Location;

                // programatically add missing parameters
                if (!map.includes("hideout", "factory4_day", "factory4_night", "laboratory")) {
                    pathData["AirdropParameters"] = [await DatabaseUtils.airdropParameters()];
                }
                if (!pathData["GenerateLocalLootCache"]) pathData["GenerateLocalLootCache"] = true;
                else pathData.GenerateLocalLootCache = true;

                const gameplay = database.core.gameplay.location

                if (gameplay.changeRaidTime) {
                    pathData.exit_access_time = gameplay.raidTimerMultiplier === 0
                        ? pathData.exit_access_time
                        : pathData.exit_access_time * gameplay.raidTimerMultiplier;
                }

                if (gameplay.changeExfiltrationTime && pathData?.exits.length > 0) {
                    for (const exit of pathData.exits) {
                        exit.ExfiltrationTime = gameplay.exfiltrationTime >= 0
                            ? gameplay.exfiltrationTime
                            : 0;
                    }
                }
                // programatically add missing parameters
                location[index] = await UtilityModel.createModelFromParse(`Location`, pathData);
            }
        }
        // await logger.success("Location Database Loaded")

    }

    static async generatePresets() {
        const presets = await Preset.initialize();
        for (const [index, preset] of Object.entries(presets)) {
            await UtilityModel.createModelFromParseWithID('Preset', index, preset);
        }
        // await logger.success("Preset Database Loaded")

    }

    static async generateRagfair() {
        const ragfairData = await Ragfair.initialize();
        await UtilityModel.createModelFromParseWithID('Ragfair', 'FleaMarket', ragfairData);
        // await logger.success("Ragfair/Flea Market Database Loaded")

    }

    static async generateCustomization() {
        const gameplay = database.core.gameplay;
        let customizations = await readParsed(`./assets/database/customization.json`);
        if (customizations.data) customizations = customizations.data;
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
        // await logger.success("Customization Database Loaded")

    }

    static async generateQuests() {
        let quests = await readParsed(`./assets/database/quests.json`);
        if (quests.data) quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
        // await logger.success("Quest Database Loaded")

    }

    static async generateEditions() {
        const editionDirectory = await getDirectoriesFrom(`./assets/database/editions/`, false);

        for (const editionType of editionDirectory) {
            const path = `./assets/database/editions/${editionType}/`;
            const edition = await UtilityModel.createModelFromParseWithID('Edition', editionType, {});
            edition.id = editionType;

            // Solve is fucking shit up
            edition.bear = await UtilityModel.createModelFromParse("Character", await readParsed(`${path}character_bear.json`));
            await edition.bear.solve();

            edition.usec = await UtilityModel.createModelFromParse("Character", await readParsed(`${path}character_usec.json`));
            await edition.usec.solve();

            edition.storage = await readParsed(`${path}storage.json`);
        }
    }

    static async generateItems() {
        const {
            customization: { allPocketsHaveSpecialSlots },
            items,
            raid: { inRaidModding }
        } = database.core.gameplay;

        let itemdata = await readParsed('./assets/database/items.json');
        if (itemdata.data)
            itemdata = itemdata.data;

        for (const [index, item] of Object.entries(itemdata)) {

            if (inRaidModding) {
                if (item?._props?.RaidModdable)
                    item._props.RaidModdable = true;
                if (item?._props?.ToolModdable)
                    item._props.ToolModdable = true;
            }

            if (items.stackSize.ammo) {
                if (item._parent === "5485a8684bdc2da71d8b4567") {
                    item._props.StackMaxSize = items.stackSize.ammo;
                }
            }

            if (allPocketsHaveSpecialSlots) {
                if (item._parent === "557596e64bdc2dc2118b4571" && item._props.Slots) {
                    item._props.Slots = await DatabaseUtils.createSpecialSlots(item);
                }
            }

            if (items.quickExamine && item?._props?.ExamineTime)
                item._props.ExamineTime = 0;

            if (items.allExamined.enabled) {
                if (!items.allExamined.exceptTheseParents.includes(item._parent)) {
                    if (!item?._props?.ExaminedByDefault) {
                        item._props.ExaminedByDefault = true;
                    }
                }
            }

            if (items.stackSize.money && item._parent === "543be5dd4bdc2deb348b4569") {
                item._props.StackMaxSize = items.stackSize.money;
            }

            if (items.stimMaxUses) {
                if (item._parent === "5448f3a14bdc2d27728b4569" && item?._props.ItemSound === "med_stimulator" || item._parent === "5448f3a64bdc2d60728b456a") {
                    item._props.MaxHpResource = items.stimMaxUses;
                }
            }

            if (items.noArmorRestrictions && item?._props?.BlocksArmorVest)
                item._props.BlocksArmorVest = false;

            if (items.Weight.enabled) {
                if (item._props.Weight > 0) {
                    item._props.Weight = (item._props.Weight * items.Weight.modifier);
                }
            }
            await UtilityModel.createModelFromParseWithID('Item', index, item);
        }
        // await logger.success("Item Database Loaded")

    }

    static async generateLanguages() {
        let languages = await readParsed(`./assets/database/locales/languages.json`);
        if (languages.data) languages = languages.data;
        database.languages = await UtilityModel.createModelFromParse("Language", languages);
        // await logger.success("Language Database Loaded")

    }

    static async generateLocales() {
        const localeDirectory = await getDirectoriesFrom(`./assets/database/locales/`, false);
        for (const key in localeDirectory) {

            const localeIdentifier = localeDirectory[key];
            const path = `./assets/database/locales/${localeIdentifier}/`;

            if (
                await fileExist(`${path}locale.json`)
                && await fileExist(`${path}menu.json`)
            ) {
                let locale = await readParsed(`${path}locale.json`);
                if (locale.data) locale = locale.data;

                if (database.core.gameplay.customization.allHeadsOnCharacterCreation) {
                    locale = await DatabaseUtils.addHeadsToLocale(locale);
                }
                if (database.core.gameplay.customization.allVoicesOnCharacterCreation) {
                    locale = await DatabaseUtils.addVoicesToLocale(locale);
                }
                let menu = await readParsed(`${path}menu.json`);
                if (menu.data) menu = menu.data;

                await UtilityModel.createModelFromParseWithID('Locale', localeIdentifier, {
                    locale: locale,
                    menu: menu
                });
            }
        }
        // await logger.success("Locale Database Loaded")

    }

    static async generateTraders() {
        const traderDirectory = await getDirectoriesFrom(`./assets/database/traders/`, false);

        for (const traderID of traderDirectory) {
            const path = `./assets/database/traders/${traderID}/`;

            const trader = await UtilityModel.createModelFromParseWithID('Trader', traderID, {});

            if (await fileExist(`${path}base.json`)) {
                trader.base = await readParsed(`${path}base.json`);
            } else {
                trader.base = [];
            }

            if (await fileExist(`${path}questassort.json`))
                trader.questassort = await readParsed(`${path}questassort.json`);

            await trader.generateAssort(await getCurrentTimestamp())

            if (await fileExist(`${path}suits.json`)) {
                trader.suits = await readParsed(`${path}suits.json`);
            }

            if (await fileExist(`${path}dialogue.json`))
                trader.dialogue = await readParsed(`${path}dialogue.json`);
            trader.solve();
        }
        // await logger.success("Trader Database Loaded")

    }

    static async generateAccounts() {
        const accountDirectory = await getDirectoriesFrom(`./user/profiles/`, false);

        if (!accountDirectory)
            await createDirectory(`./user/profiles/`);

        for (const profileID of accountDirectory) {
            const profile = `./user/profiles/${profileID}/`

            if (await fileExist(`${profile}account.json`)) {
                const path = `${profile}account.json`;

                if (!database.fileAge[profileID])
                    database.fileAge[profileID] = {}


                const account = await UtilityModel.createModelFromParseWithID('Account', profileID, await readParsed(path));
                await account.solve();

                database.fileAge[profileID].account = await getFileUpdatedDate(path);

                if (Object.keys(account).length === 0) {
                    logger.error(`Loading account data for profile: ${profileID} failed!`)
                } else
                    await logger.info(`Loaded account data for profile: ${profileID}`);
            }
        }
    }

    static async generateProfiles() {
        const profileDirectory = await getDirectoriesFrom(`./user/profiles/`, false);
        for (const profileID of profileDirectory) {
            const profile = await UtilityModel.createModelFromParseWithID("Profile", profileID, {
                character: {},
                storage: {},
                dialogues: {},
                raid: {
                    lastLocation: {
                        name: "",
                        insurance: false
                    },
                    carExtracts: 0
                }
            });

            const path = `./user/profiles/${profileID}/`;

            if (await fileExist(`${path}character.json`, true)) {
                profile.character = await UtilityModel.createModelFromParse("Character", await readParsed(`${path}character.json`));
                await profile.character.clearOrphans();
                await profile.character.solve();

                database.fileAge[profileID].character = await getFileUpdatedDate(`${path}character.json`);

                if (Object.keys(profile.character).length === 0) {
                    await logger.error(`Loading character data for profile: ${profileID} failed!`)
                } else
                    await logger.info(`Loaded character data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}storage.json`, true)) {
                profile.storage = await readParsed(`${path}storage.json`);
                database.fileAge[profileID].storage = await getFileUpdatedDate(`${path}storage.json`);

                if (!profile?.storage?._id) {
                    await logger.error(`Loading storage data for profile: ${profileID} failed!`)
                } else
                    await logger.info(`Loaded storage data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}dialogue.json`, true)) {
                const parsedDialogues = await readParsed(`${path}dialogue.json`);
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                database.fileAge[profileID].dialogues = await getFileUpdatedDate(`${path}dialogue.json`);

                if (!profile?.dialogues) {
                    await logger.error(`Loading dialogue data for profile: ${profileID} failed!`)
                } else
                    await logger.info(`Loaded dialogue data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}special.json`, true)) {
                profile.special = await readParsed(`${path}special.json`);
                database.fileAge[profileID].special = await getFileUpdatedDate(`${path}special.json`);

                if (!profile?.special?.lastCyclicUpdate) {
                    await logger.error(`Loading special data for profile: ${profileID} failed!`)
                } else
                    await logger.info(`Loaded special data for profile: ${profileID}`);
            } else {
                profile.special = {};
                database.fileAge[profileID].special = 0;
            }

            if (profile.character._id) {
                await tasker.addTask(profile.id + "_profile_tick", profile.tick, profile, 10000);
            }
        }
        await logger.success("Profile Database Loaded")

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
                children: []
            };
            await UtilityModel.createModelFromParseWithID("ItemNode", node.id, node);
        }
        const nodeModels = await ItemNode.getAllWithoutKeys();
        for (const nodeModel of nodeModels) {
            await nodeModel.generateChildrenList();
        }
    }
}


class DatabaseUtils {
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
        const extraVoices = await readParsed(`./assets/database/locales/extras.json`)
        for (const [objectId, object] of Object.entries(extraVoices.customization.Voices)) {
            for (const [property, value] of Object.entries(object)) {
                locales[`${objectId} ${property}`] = value;
            }
        }
        return locales;
    }

    static async addHeadsToLocale(locales) {
        const extraHeads = await readParsed(`./assets/database/locales/extras.json`);
        for (const [objectId, object] of Object.entries(extraHeads.templates)) {
            for (const [property, value] of Object.entries(object)) {
                locales[`${objectId} ${property}`] = value;
            }
        }
        for (const [objectId, object] of Object.entries(extraHeads.customization.Heads)) {
            for (const [property, value] of Object.entries(object)) {
                locales[`${objectId} ${property}`] = value;
            }
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

        for (let i = items.length - 1; i > -1; i--) {
            const item = items[i];
            lookup.items.byId[item.Id] = item.Price;
            lookup.items.byParent[item.ParentId] || (lookup.items.byParent[item.ParentId] = []);
            lookup.items.byParent[item.ParentId].push(item.Id);
        }

        for (let c = categories.length - 1; c > -1; c--) {
            const category = categories[c];
            lookup.categories.byId[category.Id] = category.ParentId ? category.ParentId : null;
            if (category.ParentId) {
                // root as no parent
                lookup.categories.byParent[category.ParentId] || (lookup.categories.byParent[category.ParentId] = []);
                lookup.categories.byParent[category.ParentId].push(category.Id);
            }
        }
        return lookup;
    }

    static async generateCategorizedCustomization() {
        let customizations = await readParsed("./assets/database/customization.json");
        if (typeof customizations.data != "undefined") customizations = customizations.data;

        const appearance = await readParsed("./assets/database/bot/appearance.json");
        const random = appearance.random;

        for (const [index, customization] of Object.entries(customizations)) {
            if (customization._type === "Node") continue;
            if (customization._parent === "5fc100cf95572123ae738483") {
                random.Voice.push(index);
                continue;
            }

            switch (customization._props.BodyPart) {
                case "Head":
                    random.Head.push(index);
                    break;
                case "Body":
                    random.Body.push(index);
                    break;
                case "Feet":
                    random.Feet.push(index);
                    break;
                case "Hands":
                    random.Hands.push(index);
                    break;
                default:
                    break;
            }
        }
        await writeFile("./assets/database/bot/appearance.json", stringify(appearance));
    }

    static async airdropParameters() {
        return {
            "PlaneAirdropStartMin": 300,
            "PlaneAirdropStartMax": 900,
            "PlaneAirdropEnd": 1800,
            "PlaneAirdropChance": 0.2,
            "PlaneAirdropMax": 1,
            "PlaneAirdropCooldownMin": 800,
            "PlaneAirdropCooldownMax": 900,
            "AirdropPointDeactivateDistance": 100,
            "MinPlayersCountToSpawnAirdrop": 6,
            "UnsuccessfulTryPenalty": 600
        }
    }
}

module.exports.DatabaseLoader = DatabaseLoader;

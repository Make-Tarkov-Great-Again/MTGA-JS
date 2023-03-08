const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const { Bot } = require('../models/Bot');
const { ItemNode } = require('../models/ItemNode');

const {
    logger, log, readParsed, fileExist, stringify,
    writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, getCurrentTimestamp,
    generateMongoID, getFileUpdatedDate } = require('../utilities/index.mjs');

const { tasker, database } = require('../../app.mjs');


class DatabaseLoader {
    static async setDatabase() {
        await Promise.allSettled([
            //this.generateTemplates(),
            //this.generateHideout(),
            //this.generateWeather(),
            //this.generateLanguages(),
            //this.generateLocales(),
            //this.generateTraders(),
            //this.generateCustomization(),
            //this.generateLocations(),
            //this.generateQuests()
        ])
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));
        await Promise.allSettled([
            //this.generateBots(),
            //this.generateEditions(),
            this.generateAccounts(),
            //this.generateProfiles(),
            //this.generatePresets(),
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
            })

    }

    static async generateCore() {
        await this.adjustGlobals(database.core.globals, database.core.gameplay);

        await this.adjustLocations(database.core.locations.locations, database.core.gameplay);
        // ("Global Database Loaded")

    }

    static async adjustLocations(locations, config) {
        const gameplay = config.location;

        for (const id in locations) {
            const location = locations[id];

            if (gameplay.changeRaidTime) {
                if (gameplay.raidTimerMultiplier === 0)
                    location.EscapeTimeLimit = location.EscapeTimeLimit;
                else
                    location.EscapeTimeLimit *= gameplay.raidTimerMultiplier;
            }

            if (gameplay.changeExfiltrationTime && location.exits.length !== 0) {
                for (const exit of location.exits) {
                    exit.ExfiltrationTime = gameplay.exfiltrationTime;
                }
            }
        }
    }

    static async adjustGlobals(globals, gameplay) {
        const config = globals.config;

        config.RagFair.enabled = gameplay.trading.flea.enabled;
        config.RagFair.minUserLevel = gameplay.trading.flea.minUserLevel;
        config.handbook.defaultCategory = "";

        config["AllowSelectEntryPoint"] = gameplay.raid.allowSelectEntryPoint;
        [config.TimeBeforeDeploy, config.TimeBeforeDeployLocal] = [gameplay.raid.timeBeforeDeploy, gameplay.raid.timeBeforeDeploy];

        if (gameplay.raid.removeRestrictionsInRaid)
            config.RestrictionsInRaid = [];

        if (gameplay.raid.useCustomizedStaminaSettings) {
            await DatabaseUtils.checkGlobalsForStaminaUpdate(gameplay.raid, config);
        }

        if (gameplay.weapons.useCustomizedWeaponSettings) {
            await DatabaseUtils.checkGlobalsForWeaponUpdate(gameplay.weapons, config);
        }

        if (gameplay.skills._useCustomizedSkillSettings) {
            await DatabaseUtils.checkGlobalsForSkillsUpdate(gameplay.skills, config);
        }

        if (gameplay.skills._useCustomizedHealthSettings) {
            await DatabaseUtils.checkGlobalsForHealthUpdate(gameplay.health, config);
        }

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
            weaponCache: await readParsed("./assets/database/bot/weaponCache.json")
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
        // ("Bot Database Loaded")

    }

    static async generateHideout() {
        /*         database.hideout = {
                    areas: [],
                    productions: [],
                    scavcase: []
                };
         */
        const path = `./assets/database/hideout/`;

        database.hideout = {};
        database.hideout.qte = await readParsed(`${path}qte.json`);

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


        // ("Hideout Database Loaded")

    }

    static async generateWeather() {
        database.weather = await readParsed('./assets/database/weather.json')
        if (database.weather.data) { database.weather = database.weather.data; }
        // ("Weather Database Loaded")

    }

    static async generateTemplates() {
        let template = await readParsed('./assets/database/templates.json');
        if (template.data) { template = template.data; }
        database.templates = {}

        database.templates.Handbook = {}
        database.templates.Handbook.Categories = template.Categories;

        for (const item of template.Items) {
            // Tasmanian Tiger Trooper 35 is mis-categorized
            if (item.Id === "639346cc1c8f182ad90c8972") {
                if (item.ParentId !== "5b5f6f6c86f774093f2ecf0b")
                    item.ParentId = "5b5f6f6c86f774093f2ecf0b";
                break;
            }
        }
        database.templates.Handbook.Items = template.Items;


        database.templates.priceTable = await Item.generatePriceTable(template.Items);
        database.templates.TplLookup = await DatabaseUtils.generateTplLookup(template.Items, template.Categories);

        // ("Template Database Loaded")
    }

    static async generateLocations() {
        const mapDirectory = await getDirectoriesFrom(`./assets/database/locations/`, false);

        // loop through maps
        for (const map of mapDirectory) {
            const path = `./assets/database/locations/${map}`
            const presets_path = `${path}/#presets`
            const lootSpawns_path = `${path}/lootSpawns`
            const waves_path = `${path}/waves`
            const bossWaves_path = `${path}/bossWaves`

            // structure of location
            const templateOfLocation = {
                presets: [],
                lootSpawns: {
                    containers: [],
                    dynamic: [],
                    quests: [],
                    weapons: []
                },
                waves: [],
                bossWaves: [],
                base: {},
                dynamicAvailableSpawns: {}
            };

            const location = await UtilityModel.createModelFromParseWithID('Location', map, templateOfLocation);

            // loading of dynamic staff
            const lootSpawns = await getFilesFrom(lootSpawns_path);
            for (const [index, fileName] of Object.entries(lootSpawns)) {
                // just to not confuse and not get any errors if someone puts more files
                if (
                    fileName == "containers.json" ||
                    fileName == "dynamic.json" ||
                    fileName == "quests.json" ||
                    fileName == "weapons.json") {
                    let pathData = await readParsed(`${lootSpawns_path}/${fileName}`);
                    location.lootSpawns[fileName.replace(".json", "")] = pathData;
                }
            }

            location.waves = await readParsed(`${waves_path}/default.json`);
            // load other files now
            for (let fileName of await getFilesFrom(waves_path)) {
                if (fileName == "default.json") continue;
                let data = await readParsed(`${waves_path}/${fileName}`);
                if (Array.isArray(data)) {
                    for (let wave of data) {
                        wave.number = location.waves[location.waves.length - 1].number;
                        location.waves.push(wave);
                    }
                } else if (typeof data == "object") {
                    data.number = location.waves[location.waves.length - 1].number;
                    location.waves.push(data);
                }
                logger.warn(`Additional waves from: ${fileName}`);
            }

            location.bossWaves = await readParsed(`${bossWaves_path}/default.json`);
            // load other files now
            for (let fileName of await getFilesFrom(bossWaves_path)) {
                if (fileName == "default.json") continue;
                let data = await readParsed(`${waves_path}/${fileName}`);
                if (Array.isArray(data)) {
                    for (let bossWave of data) {
                        location.bossWaves.push(bossWave);
                    }
                } else if (typeof data == "object") {
                    location.bossWaves.push(data);
                }
                logger.warn(`Additional boss waves from: ${fileName}`);
            }

            location.base = await readParsed(`${path}/base.json`);

            location.dynamicAvailableSpawns = await readParsed(`${path}/availableSpawns.json`);

            // load presets (default bsg variants varied from 1 to 6)
            const variants = await getFilesFrom(presets_path);
            for (const [index, variant] of Object.entries(variants)) {
                let pathData = await readParsed(`${presets_path}/${variant}`);

                if (pathData.data)
                    pathData = pathData.data;
                else if (pathData.Location)
                    pathData = pathData.Location;

                location.presets[index] = await UtilityModel.createModelFromParse(`Location`, pathData);
            }
        }
        // ("Location Database Loaded")

    }

    static async generateLootGen() {
        const template = { containers: {}, staticWeaponData: {} };
        let lootGen = await UtilityModel.createModelFromParseWithID('Location', "lootGen", template);
        lootGen.containersSpawnData = await readParsed(`./assets/database/lootGen/containersSpawnData.json`);
        lootGen.staticWeaponData = await readParsed(`./assets/database/lootGen/staticWeaponsData.json`);
    }

    static async generatePresets() {
        const presets = await Preset.initialize();
        for (const [index, preset] of Object.entries(presets)) {
            await UtilityModel.createModelFromParseWithID('Preset', index, preset);
        }
        // ("Preset Database Loaded")

    }

    static async generateRagfair() {
        const ragfairData = await Ragfair.initialize();
        await UtilityModel.createModelFromParseWithID('Ragfair', 'FleaMarket', ragfairData);
        // ("Ragfair/Flea Market Database Loaded")

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
        // ("Customization Database Loaded")

    }

    static async generateQuests() {
        let quests = await readParsed(`./assets/database/quests.json`);
        if (quests.data) quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
        // ("Quest Database Loaded")

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
    }

    static async generateLanguages() {
        let languages = await readParsed(`./assets/database/locales/languages.json`);
        if (languages.data) languages = languages.data;
        database.languages = await UtilityModel.createModelFromParse("Language", languages);
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
    }

    static async generateTraders() {
        

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

            await trader.generateAssort()

            if (await fileExist(`${path}suits.json`)) {
                trader.suits = await readParsed(`${path}suits.json`);
            }

            if (await fileExist(`${path}dialogue.json`))
                trader.dialogue = await readParsed(`${path}dialogue.json`);
            trader.solve();
        }

        if (!await fileExist(`./assets/database/configs/resupply.json`)) {
            database.core.resupply = {};
            await writeFile(`./assets/database/configs/resupply.json`, stringify(database.core.resupply));
        } else
            database.core.resupply = await readParsed(`./assets/database/configs/resupply.json`);

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
                    logger.info(`Loaded account data for profile: ${profileID}`);
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
                    logger.error(`Loading character data for profile: ${profileID} failed!`)
                } else
                    logger.info(`Loaded character data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}storage.json`, true)) {
                profile.storage = await readParsed(`${path}storage.json`);
                database.fileAge[profileID].storage = await getFileUpdatedDate(`${path}storage.json`);

                if (!profile?.storage?._id) {
                    logger.error(`Loading storage data for profile: ${profileID} failed!`)
                } else
                    logger.info(`Loaded storage data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}dialogue.json`, true)) {
                const parsedDialogues = await readParsed(`${path}dialogue.json`);
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                database.fileAge[profileID].dialogues = await getFileUpdatedDate(`${path}dialogue.json`);

                if (!profile?.dialogues) {
                    logger.error(`Loading dialogue data for profile: ${profileID} failed!`)
                } else
                    logger.info(`Loaded dialogue data for profile: ${profileID}`);
            }

            if (await fileExist(`${path}special.json`, true)) {
                profile.special = await readParsed(`${path}special.json`);
                database.fileAge[profileID].special = await getFileUpdatedDate(`${path}special.json`);

                if (!profile?.special?.lastCyclicUpdate) {
                    logger.error(`Loading special data for profile: ${profileID} failed!`)
                } else
                    logger.info(`Loaded special data for profile: ${profileID}`);
            } else {
                profile.special = {};
                database.fileAge[profileID].special = 0;
            }

            if (profile.character._id) {
                await tasker.addTask(profile.id + "_profile_tick", profile.tick, profile, 10000);
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

    static async checkGlobalsForStaminaUpdate(settings, config) {
        const { Stamina, StaminaRestoration, StaminaDrain } = await readParsed(settings._useCustomizedStaminaSettings, true);

        let changed = false;
        for (const [key, value] of Object.entries(config.Stamina)) {
            if (!Stamina.hasOwnProperty(key)) {
                Stamina[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        for (const [key, value] of Object.entries(config.StaminaRestoration)) {
            if (!StaminaRestoration.hasOwnProperty(key)) {
                StaminaRestoration[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        for (const [key, value] of Object.entries(config.StaminaDrain)) {
            if (!StaminaDrain.hasOwnProperty(key)) {
                StaminaDrain[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        if (changed) {
            await writeFile(settings._useCustomizedStaminaSettings,
                stringify({ Stamina, StaminaRestoration, StaminaDrain }),
                true);

            logger.info(`[NEW] Stamina settings have been added by BSG, and custom values transferred. Check them here ${settings._useCustomizedStaminaSettings} or ignore this prompt!`);
        }
    }

    static async checkGlobalsForWeaponUpdate(settings, config) {
        const { Aiming, Malfunction, Overheat } = await readParsed(settings._useCustomizedWeaponSettings, true);

        let changed = false;
        for (const [key, value] of Object.entries(config.Aiming)) {
            if (!Aiming.hasOwnProperty(key)) {
                Aiming[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        for (const [key, value] of Object.entries(config.Malfunction)) {
            if (!Malfunction.hasOwnProperty(key)) {
                Malfunction[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        for (const [key, value] of Object.entries(config.Overheat)) {
            if (!Overheat.hasOwnProperty(key)) {
                Overheat[key] = value;
                if (!changed)
                    changed = true;
            }
        }
        if (changed) {
            await writeFile(settings._useCustomizedWeaponSettings,
                stringify({ Aiming, Malfunction, Overheat }),
                true);

            logger.info(`[NEW] Weapon settings have been added by BSG, and custom values transferred. Check them here ${settings._useCustomizedWeaponSettings} or ignore this prompt!`);
        }
    }

    static async checkGlobalsForSkillsUpdate(settings, config) {
        const { SkillsSettings } = await readParsed(settings._useCustomizedSkillSettings, true);

        let changed = false;
        for (const [key, value] of Object.entries(config.SkillsSettings)) {
            if (!SkillsSettings.hasOwnProperty(key)) {
                SkillsSettings[key] = value;
                continue;
            }

            if (typeof value === "object") {
                for (const [key2, value2] of Object.entries(config.SkillsSettings[key])) {
                    if (!SkillsSettings[key].hasOwnProperty(key2)) {
                        SkillsSettings[key][key2] = value2;
                        continue;
                    }

                    if (typeof value2 === "object") {
                        for (const [key3, value3] of Object.entries(config.SkillsSettings[key][key2])) {

                            if (!SkillsSettings[key][key2].hasOwnProperty(key3)) {
                                SkillsSettings[key][key2][key3] = value3;
                                continue;
                            }

                            if (typeof value3 === "object") {
                                for (const [key4, value4] of Object.entries(config.SkillsSettings[key][key2])) {

                                    if (!SkillsSettings[key][key2][key3].hasOwnProperty(key4)) {
                                        SkillsSettings[key][key2][key3][key4] = value4;
                                        continue;
                                    }

                                    if (typeof value4 === "object") {
                                        logger.warn("[SKILLS] Layer 4 found, if you see this report as bug")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }


        if (changed) {
            await writeFile(settings._useCustomizedSkillSettings,
                stringify({ SkillsSettings }),
                true);

            logger.info(`[NEW] Skills settings have been added by BSG, and custom values transferred. Check them here ${settings._useCustomizedSkillSettings} or ignore this prompt!`);
        }
    }

    static async checkGlobalsForHealthUpdate(settings, config) {
        const { Health } = await readParsed(settings._useCustomizedHealthSettings, true);

        let changed = false;
        for (const [key, value] of Object.entries(config.Health)) {
            if (!Health.hasOwnProperty(key)) {
                Health[key] = value;
                continue;
            }

            if (typeof value === "object") {
                for (const [key2, value2] of Object.entries(config.Health[key])) {
                    if (!Health[key].hasOwnProperty(key2)) {
                        Health[key][key2] = value2;
                        continue;
                    }

                    if (typeof value2 === "object") {
                        for (const [key3, value3] of Object.entries(config.Health[key][key2])) {

                            if (!Health[key][key2].hasOwnProperty(key3)) {
                                Health[key][key2][key3] = value3;
                                continue;
                            }

                            if (typeof value3 === "object") {
                                for (const [key4, value4] of Object.entries(config.Health[key][key2])) {

                                    if (!Health[key][key2][key3].hasOwnProperty(key4)) {
                                        Health[key][key2][key3][key4] = value4;
                                        continue;
                                    }

                                    if (typeof value4 === "object") {
                                        logger.warn("[HEALTH] Layer 4 found, if you see this report as bug")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }


        if (changed) {
            await writeFile(settings._useCustomizedHealthSettings,
                stringify({ Health }),
                true);

            logger.info(`[NEW] Health settings have been added by BSG, and custom values transferred. Check them here ${settings._useCustomizedHealthSettings} or ignore this prompt!`);
        }
    }
}

module.exports.DatabaseLoader = DatabaseLoader;

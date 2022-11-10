const fs = require('fs/promises');
const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const { Bot } = require('../models/Bot');
const { ItemNode } = require('../models/ItemNode');

const {
    logger, readParsedAsync, fileExist, stringify,
    writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, getCurrentTimestamp,
    generateMongoID, round, syncGetRandomIntInc } = require('../utilities');

const { tasker, database } = require('../../app');
//const MongoId = require("mongoid-js").MongoId;


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
        if (database.core.gameplay.bots.preload.enabled) {
            database.bot.preload = await Bot.initializeBotPreload();
            if (database.core.gameplay.development.debugBots) {
                await writeFile("./bots.json", stringify(database.bot.preload))
            }
        }
    }

    static async generateCore() {
        database.core.globals = this.adjustGlobals(database.core.globals, database.core.gameplay);
    }

    static adjustGlobals(globals, gameplay) {
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

        return globals;
    }

    static async generateBots() {
        let weaponItemList = await DatabaseUtils.generateWeigthedWeaponItemLists()

        //logger.debug(weaponItemList);

        database.bot = {
            names: await readParsedAsync(`./assets/database/bot/names.json`),
            core: await readParsedAsync(`./assets/database/bot/__BotGlobalSettings.json`),
            appearance: await readParsedAsync("./assets/database/bot/appearance.json"),
            playerScav: await readParsedAsync("./assets/database/bot/playerScav.json")
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
                const health = await readParsedAsync(`${path}/health.json`);
                if (Object.keys(health).length > 0) {
                    for (const [index, value] of Object.entries(health)) {
                        database.bot.bots[bot].health[index] = value;
                    }
                } else database.bot.bots[bot].health = health;
            }
            if (await fileExist(`${path}/loadout.json`)) {
                database.bot.bots[bot].authorizedGear = await readParsedAsync(`${path}/loadout.json`);
                database.bot.bots[bot].weightedGear = await DatabaseUtils.generateWeightedList(database.bot.bots[bot].authorizedGear);
            }

            const botDifficulty = await getFilesFrom(`${path}/difficulties`);
            for (const difficulty of botDifficulty) {
                database.bot.bots[bot].difficulty[difficulty.replace(".json", "")] = await readParsedAsync(`${path}/difficulties/${difficulty}`);
            }
        }
    }

    static async generateHideout() {
        /*         database.hideout = {
                    areas: [],
                    productions: [],
                    scavcase: []
                };
         */
        const path = `./assets/database/hideout/`;

        let hideoutAreas = await readParsedAsync(`${path}areas.json`);
        if (hideoutAreas.data) { hideoutAreas = hideoutAreas.data; }
        for (const [index, area] of Object.entries(hideoutAreas)) {
            await UtilityModel.createModelFromParseWithID('HideoutArea', index, area);
        }

        let hideoutProductions = await readParsedAsync(`${path}productions.json`);
        if (hideoutProductions.data) { hideoutProductions = hideoutProductions.data; }
        for (const production of Object.values(hideoutProductions)) {
            if (database.core.gameplay.hideout.fastProduction === true) {
                production.productionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutProduction', production._id, production);
        }

        let hideoutScavcase = await readParsedAsync(`${path}scavcase.json`);
        if (hideoutScavcase.data) { hideoutScavcase = hideoutScavcase.data; }
        for (const scavcase of Object.values(hideoutScavcase)) {
            if (database.core.gameplay.hideout.fastScavcase === true) {
                scavcase.ProductionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutScavcase', scavcase._id, scavcase);
        }
    }

    static async generateWeather() {
        database.weather = await readParsedAsync('./assets/database/weather.json')
        if (database.weather.data) { database.weather = database.weather.data; }
    }

    static async generateTemplates() {
        let template = await readParsedAsync('./assets/database/templates.json');
        if (template.data) { template = template.data; }
        database.templates = {
            Categories: template.Categories,
            Items: template.Items,
            priceTable: await Item.generatePriceTable(template.Items),
            TplLookup: await DatabaseUtils.generateTplLookup(template.Items, template.Categories)
        };
    }

    static async generateLocations() {
        const mapDirectory = await getDirectoriesFrom(`./assets/database/locations/`, false);

        for (const map of mapDirectory) {
            const path = `./assets/database/locations/${map}`

            const location = await UtilityModel.createModelFromParseWithID('Location', map, {});
            const variants = await getFilesFrom(path);
            for (const [index, variant] of Object.entries(variants)) {
                let pathData = await readParsedAsync(`${path}/${variant}`);
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
        let customizations = await readParsedAsync(`./assets/database/customization.json`);
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
    }

    static async generateQuests() {
        let quests = await readParsedAsync(`./assets/database/quests.json`);
        if (quests.data) quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
    }

    static async generateEditions() {
        const editionDirectory = await getDirectoriesFrom(`./assets/database/editions/`, false);

        for (const editionType of editionDirectory) {
            const path = `./assets/database/editions/${editionType}/`;
            const edition = await UtilityModel.createModelFromParseWithID('Edition', editionType, {});
            edition.id = editionType;

            edition.bear = await UtilityModel.createModelFromParse("Character", await readParsedAsync(`${path}character_bear.json`));
            await edition.bear.solve();

            edition.usec = await UtilityModel.createModelFromParse("Character", await readParsedAsync(`${path}character_usec.json`));
            await edition.usec.solve();

            edition.storage = await readParsedAsync(`${path}storage.json`);
        }
    }

    static async generateItems() {
        const {
            customization: { allPocketsHaveSpecialSlots },
            items,
            raid: { inRaidModding }
        } = database.core.gameplay;

        let itemdata = await readParsedAsync('./assets/database/items.json');
        if (itemdata.data) { itemdata = itemdata.data; }


        for (const [index, item] of Object.entries(itemdata)) {

            if (inRaidModding) {
                if (item?._props?.RaidModdable) item._props.RaidModdable = true;
                if (item?._props?.ToolModdable) item._props.ToolModdable = true;
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
                    item._props.Weight = item._props.Weight * items.Weight.modifier;
                }
            }
            await UtilityModel.createModelFromParseWithID('Item', index, item);
        }
    }

    static async generateLanguages() {
        let languages = await readParsedAsync(`./assets/database/locales/languages.json`);
        if (languages.data) languages = languages.data;
        for (const language of Object.values(languages)) {
            await UtilityModel.createModelFromParseWithID('Language', language.ShortName, language);
        }
    }

    static async generateLocales() {
        const localeDirectory = await getDirectoriesFrom(`./assets/database/locales/`, false);
        this.locales = {};
        for (const key in localeDirectory) {

            const localeIdentifier = localeDirectory[key];
            const path = `./assets/database/locales/${localeIdentifier}/`;

            if (
                await fileExist(`${path}locale.json`)
                && await fileExist(`${path}menu.json`)
            ) {
                let locale = await readParsedAsync(`${path}locale.json`);
                if (locale.data) locale = locale.data;

                if (database.core.gameplay.customization.allHeadsOnCharacterCreation === true) {
                    locale = await DatabaseUtils.addHeadsToLocale(locale);
                }
                if (database.core.gameplay.customization.allVoicesOnCharacterCreation === true) {
                    locale = await DatabaseUtils.addVoicesToLocale(locale);
                }
                let menu = await readParsedAsync(`${path}menu.json`);
                if (menu.data) menu = menu.data;

                await UtilityModel.createModelFromParseWithID('Locale', localeIdentifier, {
                    locale: locale,
                    menu: menu
                });
            }
        }
    }

    static async generateTraders() {
        const traderDirectory = await getDirectoriesFrom(`./assets/database/traders/`, false);

        for (const traderID of traderDirectory) {
            const path = `./assets/database/traders/${traderID}/`;

            const trader = await UtilityModel.createModelFromParseWithID('Trader', traderID, {});

            if (await fileExist(`${path}base.json`)) {
                trader.base = await readParsedAsync(`${path}base.json`);
                if (trader.base.repair.availability)
                    trader.base.repair.price_rate = 0;
            } else {
                trader.base = [];
            }

            if (await fileExist(`${path}questassort.json`)) {
                trader.questassort = await readParsedAsync(`${path}questassort.json`);
            }
            const currentTime = await getCurrentTimestamp();
            await trader.generateAssort(currentTime);

            trader.suits = await fileExist(`${path}suits.json`)
                ? await readParsedAsync(`${path}suits.json`)
                : []

            trader.dialogue = await fileExist(`${path}dialogue.json`)
                ? await readParsedAsync(`${path}dialogue.json`)
                : [];

            trader.solve();
        }
    }

    static async generateAccounts() {
        const accountDirectory = await getDirectoriesFrom(`./user/profiles/`, false);

        if (!accountDirectory)
            await createDirectory(`./user/profiles/`);


        for (const profileID of accountDirectory) {
            const profile = `./user/profiles/${profileID}/`

            if (await fileExist(`${profile}account.json`)) {
                const account = `${profile}account.json`;
                logger.debug("[DATABASE][ACCOUNTS] Loading user account " + profileID);

                const data = await UtilityModel.createModelFromParseWithID('Account', profileID, await readParsedAsync(account));
                await data.solve();

                const stats = await fs.stat(account);
                database.fileAge[profileID] = { account: stats.mtimeMs };
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
            let stats;

            if (await fileExist(`${path}character.json`)) {
                logger.warn(`Loading character data for profile ${profileID}`);
                profile.character = await UtilityModel.createModelFromParse("Character", await readParsedAsync(`${path}character.json`));
                await profile.character.clearOrphans();
                await profile.character.solve();
                stats = await fs.stat(`${path}character.json`);
                database.fileAge[profileID].character = stats.mtimeMs;
            }

            if (await fileExist(`${path}storage.json`)) {
                logger.warn(`Loading storage data for profile: ${profileID}`);
                let parsedStorage = await readParsedAsync(`${path}storage.json`);
                if (parsedStorage.data) { parsedStorage = parsedStorage.data; }
                profile.storage = parsedStorage;

                stats = await fs.stat(`${path}storage.json`);
                database.fileAge[profileID].storage = stats.mtimeMs;
            }

            if (await fileExist(`${path}dialogue.json`)) {
                logger.warn(`Loading dialogue data for profile: ${profileID}`);

                let parsedDialogues = await readParsedAsync(`${path}dialogue.json`);
                if (parsedDialogues.data) { parsedDialogues = parsedDialogues.data; }
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                stats = await fs.stat(`${path}dialogue.json`);
                database.fileAge[profileID].dialogues = stats.mtimeMs;
            }

            if (await fileExist(`${path}special.json`)) {
                logger.warn(`Loading special data for profile: ${profileID}`);

                let parsedSpecialData = await readParsedAsync(`${path}special.json`);
                if (parsedSpecialData.data) { parsedSpecialData = parsedSpecialData.data; }
                profile.special = parsedSpecialData

                stats = await fs.stat(`${path}special.json`);
                database.fileAge[profileID].special = stats.mtimeMs;
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
        const extraVoices = await readParsedAsync(`./assets/database/locales/extras.json`)
        for (let [key, value] of Object.entries(extraVoices.customization.Voices)) {
            locales.customization[key] = value;
        }
        return locales;
    }

    static async addHeadsToLocale(locales) {
        const extraHeads = await readParsedAsync(`./assets/database/locales/extras.json`);
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
        let customizations = await readParsedAsync("./assets/database/customization.json");
        if (typeof customizations.data != "undefined") customizations = customizations.data;

        const appearance = await readParsedAsync("./assets/database/bot/appearance.json");
        const random = appearance.random;

        for (const [index, customization] of Object.entries(customizations)) {
            if (customization._type == "Node") continue;
            if (customization._parent == "5fc100cf95572123ae738483") {
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

    static async generateWeightedList(authorizedGear) {
        const finalResult = [];
        for (const gearCateg in authorizedGear) {
            // retrieve all prices of items in categ
            const itemsWithPrices = [];
            for (const item of authorizedGear[gearCateg]) {
                itemsWithPrices.push(
                    {
                        itemId: [item],
                        price: await Item.getItemPrice(item)
                    }
                );
            }
            // retrieve the total prices of all items in categ
            let totalPrice = 0;
            for (const item of itemsWithPrices) {
                totalPrice += item.price;
            }
            // retrieve percentage of price on totalPrice for item
            const percentageList = [];
            for (const item of itemsWithPrices) {
                percentageList[item.itemId] = await round(item.price / totalPrice * 100);
            }
            // invert percentage: high percentage cost of totalPrice become low weight
            const invertedWeight = [];
            const keys = Object.keys(percentageList);
            const values = Object.values(percentageList);
            let j = 0;
            for (let i = values.length - 1; i >= 0; i--) {
                invertedWeight.push({ [keys[j]]: values[i] });
                j += 1;
            }
            finalResult.push({ [gearCateg]: invertedWeight });
        }
        return finalResult;
    }

    static async generateWeigthedWeaponItemLists() {
        const scavWeaponsFileExists = await fileExist("./assets/database/bot/scav_weapons.json");
        const scavAttachmentsFileExists = await fileExist("./assets/database/bot/scav_attachments.json");
        const raiderWeaponsFileExists = await fileExist("./assets/database/bot/raider_weapons.json");
        const raiderAttachmentsFileExists = await fileExist("./assets/database/bot/raider_attachments.json");

        if (!scavWeaponsFileExists || !scavAttachmentsFileExists ||
            !raiderWeaponsFileExists || !raiderAttachmentsFileExists) {
            const itemList = await DatabaseUtils.generateWeaponAndAttachmentItemList();
            const [scavWeapons, scavAttachements, raiderWeapons, raiderAttachments] = [[], [], [], []];

            for (const item of itemList) {
                if (!scavWeaponsFileExists && item.type === "weapon") {
                    const weightedItem = await DatabaseUtils.generateItemWeight("scav", item) // do weighting
                    scavWeapons.push(weightedItem);
                }

                if (!scavAttachmentsFileExists && item.type === "attachment") {
                    const weightedItem = await DatabaseUtils.generateItemWeight("scav", item) // do weighting
                    scavAttachements.push(weightedItem);
                }

                if (!raiderWeaponsFileExists && item.type === "weapon") {
                    const weightedItem = await DatabaseUtils.generateItemWeight("raider", item) // do weighting
                    raiderWeapons.push(weightedItem);
                }

                if (!raiderAttachmentsFileExists && item.type === "attachment") {
                    const weightedItem = await DatabaseUtils.generateItemWeight("raider", item) // do weighting
                    raiderAttachments.push(weightedItem);
                }
            }

            if (!scavWeaponsFileExists) {
                await writeFile("./assets/database/bot/scav_weapons.json", stringify(scavWeapons));
            }

            if (!scavAttachmentsFileExists) {
                await writeFile("./assets/database/bot/scav_attachments.json", stringify(scavAttachements));
            }

            if (!raiderWeaponsFileExists) {
                await writeFile("./assets/database/bot/raider_weapons.json", stringify(raiderWeapons));
            }

            if (!raiderAttachmentsFileExists) {
                await writeFile("./assets/database/bot/raider_attachments.json", stringify(raiderAttachments));
            }
        }
    }

    static async generateWeaponAndAttachmentItemList() {
        const itemList = [];
        const templateItems = await Item.getAll();

        for (const templateItem of Object.values(templateItems)) {
            if (!["Item", "item"].includes(templateItem._type) || !templateItem._name.startsWith("weapon_")
            ) {
                continue;
            }

            const itemObjectList = await DatabaseUtils.generateWeaponItemObjectList(templateItem, itemList);
            itemList = [...itemList, ...itemObjectList]
        }

        return itemList;
    }

    static async generateWeaponItemObjectList(templateItem, duplicateCheck) {
        if (duplicateCheck.find(item => item.tpl === templateItem._id)) {
            return [];
        }

        let itemObjectList = []
        let item = {};
        item.tpl = templateItem._id;
        item.name = templateItem._name;

        if (templateItem._name.startsWith("weapon_")) {
            item.type = "weapon";
        } else {
            item.type = "attachment";
        }

        item.slots = [];

        if (typeof templateItem._props.Slots !== "undefined" && templateItem._props.Slots.length > 0) {
            for (const templateSlot of templateItem._props.Slots) {
                let slot = {};
                slot.name = templateSlot._name
                slot.id = templateSlot._id
                slot.required = templateSlot._required;
                slot.mergeSlotWithChildren = templateSlot._mergeSlotWithChildren
                slot.attachments = templateSlot._props.filters[0].Filter;
                item.slots.push(slot);

                for (let attachementId of templateSlot._props.filters[0].Filter) {
                    let attachmentObjectList = await DatabaseUtils.generateWeaponItemObjectList(await Item.get(attachementId), duplicateCheck);
                    duplicateCheck = [...duplicateCheck, ...attachmentObjectList]
                    itemObjectList = [...itemObjectList, ...attachmentObjectList]
                }
            }
        }

        if (item.slots.length === 0) {
            delete item.slots;
        }

        itemObjectList.push(item);

        return itemObjectList;
    }

    static async generateItemWeight(botType, item) {
        //let itemPrice = await Item.getItemPrice(item.tpl);

        //item.price = itemPrice;

        return item;
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

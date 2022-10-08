const fs = require('fs');
const { Preset } = require('../models/Preset');
const { Ragfair } = require('../models/Ragfair');
const { Item } = require('../models/Item');
const { UtilityModel } = require('../models/UtilityModel');
const { Bot } = require('../models/Bot');
const { ItemNode } = require('../models/ItemNode');

const {
    logger, readParsed, fileExist, stringify,
    writeFile, getDirectoriesFrom, createDirectory,
    getFilesFrom, getCurrentTimestamp, getAbsolutePathFrom,
    generateMongoID, round } = require('../../utilities');

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
        if (database.core.gameplay.bots.preload) {
            database.bot.preload = await Bot.preloadBots();
            if (database.core.development.debugBots) writeFile("./preloadBots.json", stringify(database.bot.preload));
        }
    }

    static async generateCore() {
        database.core = {
            serverConfig: readParsed(getAbsolutePathFrom(`/database/configs/server.json`)),
            matchMetrics: readParsed(getAbsolutePathFrom(`/database/configs/matchMetrics.json`)),
            globals: readParsed(getAbsolutePathFrom(`/database/configs/globals.json`)).data,
            botTemplate: readParsed(getAbsolutePathFrom(`/database/configs/schema/botTemplate.json`)),
            clientSettings: readParsed(getAbsolutePathFrom(`/database/configs/client.settings.json`)).data,
            gameplay: readParsed(getAbsolutePathFrom(`/database/configs/gameplay.json`)),
            locations: readParsed(getAbsolutePathFrom(`/database/configs/locations.json`)),
            hideoutSettings: readParsed(getAbsolutePathFrom(`/database/hideout/settings.json`)).data,
            blacklist: readParsed(getAbsolutePathFrom(`/database/configs/blacklist.json`)),
            connections: {
                webSocket: {},
                webSocketPings: {}
            }
        };
    }

    static async generateBots() {
        let weaponItemList = await DatabaseUtils.generateWeigthedWeaponItemLists()

        //logger.debug(weaponItemList);

        database.bot = {
            names: readParsed(`./database/bot/names.json`),
            core: readParsed(`./database/bot/__BotGlobalSettings.json`),
            appearance: readParsed("./database/bot/appearance.json"),
            playerScav: readParsed("./database/bot/playerScav.json")
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
        if (hideoutAreas.data) { hideoutAreas = hideoutAreas.data; }
        for (const [index, area] of Object.entries(hideoutAreas)) {
            await UtilityModel.createModelFromParseWithID('HideoutArea', index, area);
        }

        let hideoutProductions = readParsed(getAbsolutePathFrom('/database/hideout/productions.json'));
        if (hideoutProductions.data) { hideoutProductions = hideoutProductions.data; }
        for (const production of Object.values(hideoutProductions)) {
            if (database.core.gameplay.hideout.fastProduction === true) {
                production.productionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutProduction', production._id, production);
        }

        let hideoutScavcase = readParsed(getAbsolutePathFrom('/database/hideout/scavcase.json'));
        if (hideoutScavcase.data) { hideoutScavcase = hideoutScavcase.data; }
        for (const scavcase of Object.values(hideoutScavcase)) {
            if (database.core.gameplay.hideout.fastScavcase === true) {
                scavcase.ProductionTime = 100;
            }
            await UtilityModel.createModelFromParseWithID('HideoutScavcase', scavcase._id, scavcase);
        }
    }

    static async generateWeather() {
        database.weather = readParsed(getAbsolutePathFrom('/database/weather.json'))
        if (database.weather.data) { database.weather = database.weather.data; }
    }

    static async generateTemplates() {
        let template = readParsed(getAbsolutePathFrom('/database/templates.json'));
        if (template.data) { template = template.data; }
        database.templates = {
            Categories: template.Categories,
            Items: template.Items,
            priceTable: await Item.generatePriceTable(template.Items),
            TplLookup: await DatabaseUtils.generateTplLookup(template.Items, template.Categories)
        };
    }

    static async generateLocations() {
        const maps = getDirectoriesFrom('/database/locations');
        for (const map of maps) {
            const location = await UtilityModel.createModelFromParseWithID('Location', map, {});
            const variants = getFilesFrom(getAbsolutePathFrom(`/database/locations/${map}`), false);
            for (const [index, variant] of Object.entries(variants)) {
                let pathData = readParsed(getAbsolutePathFrom(`/database/locations/${map}/${variant}`));
                if (pathData.Location) pathData = pathData.Location;

                // programatically add missing parameters
                if (!map.includes("hideout", "factory4_day", "factory4_night", "laboratory")) {
                    pathData["AirdropParameters"] = [await DatabaseUtils.airdropParameters()];
                }
                if (!pathData["GenerateLocalLootCache"]) pathData["GenerateLocalLootCache"] = true;
                else pathData.GenerateLocalLootCache = true;
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
        let customizations = readParsed(getAbsolutePathFrom("/database/customization.json"));
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
        let quests = readParsed(getAbsolutePathFrom("/database/quests.json"));
        if (quests.data) quests = quests.data;
        for (const [index, quest] of Object.entries(quests)) {
            await UtilityModel.createModelFromParseWithID('Quest', index, quest);
        }
    }

    static async loadDialogues() {
        return "your mom gay";
    }

    static async generateEditions() {
        const editionKeys = getDirectoriesFrom('/database/editions/');
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
        if (items.data) { items = items.data; }


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
                if (!gameplay.items.allExamined.exceptTheseParents.includes(item._parent)) {
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
        if (languages.data) languages = languages.data;
        for (const language of Object.values(languages)) {
            await UtilityModel.createModelFromParseWithID('Language', language.ShortName, language);
        }
    }

    static async generateLocales() {
        const locales = getDirectoriesFrom(`/database/locales/`);
        this.locales = {};
        for (const key in locales) {
            const localeIdentifier = locales[key];
            const currentLocalePath = `/database/locales/${localeIdentifier}/`;
            if (fileExist(`${currentLocalePath}locale.json`) && fileExist(`${currentLocalePath}menu.json`)) {
                let locale = readParsed(getAbsolutePathFrom(`${currentLocalePath}locale.json`));
                if (locale.data) locale = locale.data;

                if (database.core.gameplay.customization.allHeadsOnCharacterCreation === true) {
                    locale = await DatabaseUtils.addHeadsToLocale(locale);
                }
                if (database.core.gameplay.customization.allVoicesOnCharacterCreation === true) {
                    locale = await DatabaseUtils.addVoicesToLocale(locale);
                }
                let menu = readParsed(getAbsolutePathFrom(`${currentLocalePath}menu.json`));
                if (menu.data) menu = menu.data;

                await UtilityModel.createModelFromParseWithID('Locale', localeIdentifier, {
                    locale: locale,
                    menu: menu
                });
            }
        }
    }

    static async generateTraders() {
        const traderKeys = getDirectoriesFrom('/database/traders/');
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

        for (const profileID of getDirectoriesFrom('/user/profiles/')) {
            if (fileExist("/user/profiles/" + profileID + "/account.json")) {
                logger.debug("[DATABASE][ACCOUNTS] Loading user account " + profileID);

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
                dialogues: {},
                raid: {
                    lastLocation: {
                        name: "",
                        insurance: false
                    },
                    carExtracts: 0
                }
            });
            const path = getAbsolutePathFrom(`/user/profiles/${profileID}/`);
            let stats;

            if (fileExist(`user/profiles/${profileID}/character.json`)) {
                logger.warn(`Loading character data for profile ${profileID}`);
                profile.character = await UtilityModel.createModelFromParse("Character", readParsed(`${path}character.json`));
                await profile.character.clearOrphans();
                await profile.character.solve();
                stats = fs.statSync(`${path}character.json`);
                database.fileAge[profileID].character = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/storage.json`)) {
                logger.warn(`Loading storage data for profile: ${profileID}`);
                let parsedStorage = readParsed(`${path}storage.json`);
                if (parsedStorage.data) { parsedStorage = parsedStorage.data; }
                profile.storage = parsedStorage;

                stats = fs.statSync(`${path}storage.json`);
                database.fileAge[profileID].storage = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/dialogue.json`)) {
                logger.warn(`Loading dialogue data for profile: ${profileID}`);

                let parsedDialogues = readParsed(`${path}dialogue.json`);
                if (parsedDialogues.data) { parsedDialogues = parsedDialogues.data; }
                profile.dialogues = await UtilityModel.createCollectionFromParse("Dialogue", parsedDialogues);

                stats = fs.statSync(`${path}dialogue.json`);
                database.fileAge[profileID].dialogues = stats.mtimeMs;
            }

            if (fileExist(`user/profiles/${profileID}/special.json`)) {
                logger.warn(`Loading special data for profile: ${profileID}`);

                let parsedSpecialData = readParsed(`${path}special.json`);
                if (parsedSpecialData.data) { parsedSpecialData = parsedSpecialData.data; }
                profile.special = parsedSpecialData

                stats = fs.statSync(`${path}special.json`);
                database.fileAge[profileID].special = stats.mtimeMs;
            } else {
                profile.special = {};
                database.fileAge[profileID].special = 0;
            }

            await tasker.addTask(profile.id + "_profile_tick", profile.tick, profile, 10000);
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
        let scavWeaponsFileExists = !!fileExist("/database/bot/scav_weapons.json");
        let scavAttachmentsFileExists = !!fileExist("/database/bot/scav_attachments.json");
        let raiderWeaponsFileExists = !!fileExist("/database/bot/raider_weapons.json");
        let raiderAttachmentsFileExists = !!fileExist("/database/bot/raider_attachments.json");

        if (
            !scavWeaponsFileExists ||
            !scavAttachmentsFileExists ||
            !raiderWeaponsFileExists ||
            !raiderAttachmentsFileExists
        ) {
            let itemList = await DatabaseUtils.generateWeaponAndAttachmentItemList();
            let scavWeapons = [];
            let scavAttachements = [];
            let raiderWeapons = [];
            let raiderAttachments = [];

            for (let item of itemList) {
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
                writeFile("/database/bot/scav_weapons.json", stringify(scavWeapons));
            }

            if (!scavAttachmentsFileExists) {
                writeFile("/database/bot/scav_attachments.json", stringify(scavAttachements));
            }

            if (!raiderWeaponsFileExists) {
                writeFile("/database/bot/raider_weapons.json", stringify(raiderWeapons));
            }

            if (!raiderAttachmentsFileExists) {
                writeFile("/database/bot/raider_attachments.json", stringify(raiderAttachments));
            }
        }
    }

    static async generateWeaponAndAttachmentItemList() {
        let itemList = [];
        const templateItems = await Item.getAll();

        for (const [id, templateItem] of Object.entries(templateItems)) {
            if (
                (templateItem._type !== "Item" && templateItem._type !== "item") ||
                !templateItem._name.startsWith("weapon_")
            ) { continue; }
            let itemObjectList = await DatabaseUtils.generateWeaponItemObjectList(templateItem, itemList);

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

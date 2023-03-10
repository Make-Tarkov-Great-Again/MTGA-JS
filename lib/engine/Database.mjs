import {
    readParsed, getDirectoriesFrom, getFilesFrom,
    getFileUpdatedDate, generateMongoID, fileExist, createDirectory,
    logger, writeFile, stringify, getModTimeFormat
} from "../utilities/_index.mjs";


class Database {
    constructor() {
        this.fileAge = {};
        this.core = {};
        this.items = {};
        this.locales = {};
        this.languages = {};
        this.templates = {};
        this.traders = {};
        this.flea = {};
        this.quests = {};
        this.hideout = {};
        this.locations = {};
        this.weather = {};
        this.customization = {};
        this.editions = {};
        this.presets = {};
        this.bot = {};
        this.profiles = {};
        this.mods = {};
    };

    async initialize() {
        // first we load all the data
        await Promise.allSettled([
            await this.setCore(),
            await this.setItems(),
            await this.setLocales(),
            await this.setLanguages(),
            await this.setTemplates(),
            await this.setTraders(),
            await this.setFlea(),
            await this.setQuests(),
            await this.setHideout(),
            await this.setLocations(),
            await this.setWeather(),
            await this.setCustomizations(),
            await this.setEditions(),
            await this.setPresets(),
            await this.setBots(),
            await this.setProfiles(),
            await this.setMods()
        ]);
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.value}`)));

        // then we adjust it
        await Promise.allSettled([
            await DatabaseUtils.adjustGlobals(this.core.globals, this.core.gameplay),
            await DatabaseUtils.adjustItems(this.core.gameplay, this.items),
            await DatabaseUtils.adjustLocales(this.core.gameplay, this.locales),
            await DatabaseUtils.adjustLanguages(),
            await DatabaseUtils.adjustQuests(),
            await DatabaseUtils.adjustHideout(this.core.gameplay, this.hideout),
            await DatabaseUtils.adjustLocations(this.core.gameplay, this.core.locations.locations),
            await DatabaseUtils.adjustWeather(),
            await DatabaseUtils.adjustCustomizations(this.core.gameplay, this.customization),
            await DatabaseUtils.adjustEditions(),
            await DatabaseUtils.adjustPresets(),
            await DatabaseUtils.adjustBots(this.bot),
            await DatabaseUtils.adjustFlea(),
            await DatabaseUtils.adjustProfiles(this.profiles)
        ]);
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.value}`)));
    }


    async setCore() {
        this.core.botTemplate = await readParsed(`./assets/database/configs/schema/botTemplate.json`);

        const clientSettings = await readParsed(`./assets/database/configs/client.settings.json`);
        this.core.clientSettings = clientSettings?.data ? clientSettings.data : clientSettings;

        this.core.gameplay = await readParsed(`./assets/database/configs/gameplay.json`);

        const globals = await readParsed(`./assets/database/configs/globals.json`);
        this.core.globals = globals?.data ? globals.data : globals;

        const locations = await readParsed(`./assets/database/configs/locations.json`);
        this.core.locations = locations?.data ? locations.data : locations;

        const hideoutSettings = await readParsed(`./assets/database/hideout/settings.json`);
        this.core.hideoutSettings = hideoutSettings?.data ? hideoutSettings.data : hideoutSettings;

        this.core.blacklist = await readParsed(`./assets/database/configs/blacklist.json`);

        this.core.metrics = await readParsed(`./assets/database/configs/matchMetrics.json`);

        this.core.connections = {
            webSocket: {},
            webSocketPings: {}
        };

        if (!await fileExist(`./assets/database/configs/resupply.json`)) {
            this.core.resupply = {};
            await writeFile(`./assets/database/configs/resupply.json`, stringify(this.core.resupply));
        } else
            this.core.resupply = await readParsed(`./assets/database/configs/resupply.json`);
    }

    /**
     * Load items data from JSON
     */
    async setItems() {
        const items = await readParsed('./assets/database/items.json');
        this.items = items?.data ? items.data : items;
    }

    /**
     * Load locales data from JSON
     */
    async setLocales() {
        const directory = await getDirectoriesFrom(`./assets/database/locales/`, false);
        for (const key in directory) {

            const language = directory[key];
            const path = `./assets/database/locales/${language}/`;

            if (await fileExist(`${path}locale.json`) && await fileExist(`${path}menu.json`)) {
                this.locales[language] = {};

                const locale = await readParsed(`${path}locale.json`);
                this.locales[language].locale = locale?.data ? locale.data : locale;
                const menu = await readParsed(`${path}menu.json`);
                this.locales[language].menu = menu?.data ? menu.data : menu;
            } else logger.error(`${language} doesn't exist, scream at the developers!!!!!!!`);
        }
    }

    /**
     * Load languages data from JSON
     */
    async setLanguages() {
        const languages = await readParsed(`./assets/database/locales/languages.json`);
        this.languages = languages?.data ? languages.data : languages;
    }

    /**
     * Load templates data from JSON
     */
    async setTemplates() {
        const templates = await readParsed('./assets/database/templates.json');
        this.templates.Handbook = templates?.data ? templates.data : templates;
        await this.setTemplatesPriceTable();
        this.templates.TplLookup = await this.getTplLookup(this.templates.Handbook.Items, this.templates.Handbook.Categories);
    }

    async getTplLookup(items, categories) {
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

    /**
     * Load bots data from JSON
     */
    async setBots() {

        this.bot.core = await fileExist(`./assets/database/bot/__BotGlobalSettings.json`)
            ? await readParsed(`./assets/database/bot/__BotGlobalSettings.json`)
            : logger.error("File in /assets/database/bot/__BotGlobalSettings.json doesn't exist!");

        this.bot.names = await fileExist(`./assets/database/bot/names.json`)
            ? await readParsed(`./assets/database/bot/names.json`)
            : logger.error("File in /assets/database/bot/names.json doesn't exist!");

        this.bot.appearance = await fileExist(`./assets/database/bot/appearance.json`)
            ? await readParsed(`./assets/database/bot/appearance.json`)
            : logger.error("File in /assets/database/bot/appearance.json doesn't exist!");

        this.bot.playerScav = await fileExist(`./assets/database/bot/playerScav.json`)
            ? await readParsed(`./assets/database/bot/playerScav.json`)
            : logger.error("File in /assets/database/bot/playerScav.json doesn't exist!");

        this.bot.weaponCache = await fileExist(`./assets/database/bot/weaponCache.json`)
            ? await readParsed(`./assets/database/bot/weaponCache.json`)
            : logger.error("File in /assets/database/bot/weaponCache.json doesn't exist!");


        await this.setBot();
    }

    async setBot() {
        this.bot.bots = {};
        const botDirectory = await getDirectoriesFrom(`./assets/database/bot/bots`, false);

        for (const bot of botDirectory) {
            this.bot.bots[bot] = {};
            const path = `./assets/database/bot/bots/${bot}`;

            if (await fileExist(`${path}/health.json`)) {
                this.bot.bots[bot].health = {};
                const health = await readParsed(`${path}/health.json`);
                if (Object.keys(health).length > 0) {
                    for (const [index, value] of Object.entries(health)) {
                        this.bot.bots[bot].health[index] = value;
                    }
                } else this.bot.bots[bot].health = health;
            }

            if (await fileExist(`${path}/loadout.json`)) {
                this.bot.bots[bot].loadout = await readParsed(`${path}/loadout.json`);
            }

            this.bot.bots[bot].difficulty = {};
            const botDifficulty = await getFilesFrom(`${path}/difficulties`);

            for (const difficulty of botDifficulty) {
                this.bot.bots[bot].difficulty[difficulty.replace(".json", "")] = await readParsed(`${path}/difficulties/${difficulty}`);
            }
        }
    }

    /**
     * Load the templates price table propertie using either base prices or flea prices
     */
    async setTemplatesPriceTable() {
        const fleaPrices = this.core.gameplay.trading.flea.liveFleaPrices;
        const liveFlea = await readParsed("./assets/database/liveflea.json");

        this.templates.priceTable = {};

        for (const item of this.templates.Handbook.Items) {
            if (fleaPrices && liveFlea[item.Id])
                this.templates.priceTable[item.Id] = liveFlea[item.Id];
            else
                this.templates.priceTable[item.Id] = item.Price;
        }
    }

    /**
     * Load the traders data from JSON
     */
    async setTraders() {
        const traderDirectory = await getDirectoriesFrom(`./assets/database/traders/`, false);
        for (const traderID of traderDirectory) {
            const traderPath = `./assets/database/traders/${traderID}/`;
            const traderData = {};

            if (await fileExist(`${traderPath}base.json`))
                traderData.base = await readParsed(`${traderPath}base.json`);
            else
                traderData.base = []; //not sure why we do this....

            if (await fileExist(`${traderPath}questassort.json`))
                traderData.questassort = await readParsed(`${traderPath}questassort.json`);

            if (await fileExist(`${traderPath}assort.json`)) {
                traderData.baseAssort = await readParsed(`${traderPath}assort.json`);
                traderData.baseAssort = traderData.baseAssort?.data ? traderData.baseAssort.data : traderData.baseAssort;
            }

            if (await fileExist(`${traderPath}suits.json`))
                traderData.suits = await readParsed(`${traderPath}suits.json`);

            if (await fileExist(`${traderPath}dialogue.json`))
                traderData.dialogue = await readParsed(`${traderPath}dialogue.json`);

            this.traders[traderID] = traderData;
        }
    }

    async setFlea() {
        this.flea.offers = [];
        this.flea.offersCount = 0;
        this.flea.selectedCategory = "";
        this.flea.categories = {};
    }

    /**
     * Load the quests data from JSON
     */
    async setQuests() {
        const quests = await readParsed(`./assets/database/quests.json`);
        this.quests = quests?.data ? quests.data : quests;
    }

    /**
     * Load the hideout data (areas, productions, scavcase) from JSON
     */
    async setHideout() {
        const path = `./assets/database/hideout/`;

        const qte = await readParsed(`${path}qte.json`);
        this.hideout.qte = qte?.data ? qte.data : qte;

        const areas = await readParsed(`${path}areas.json`);
        this.hideout.areas = areas?.data ? areas.data : areas;

        const productions = await readParsed(`${path}productions.json`);
        this.hideout.productions = productions?.data ? productions.data : productions;

        const scavcase = await readParsed(`${path}scavcase.json`);
        this.hideout.scavcase = scavcase?.data ? scavcase.data : scavcase;
    }

    /**
     * Load the locations data from JSON
     */
    async setLocations() {
        const mapDirectory = await getDirectoriesFrom(`./assets/database/locations/`, false);

        for (const map of mapDirectory) {
            const path = `./assets/database/locations/${map}`;

            this.locations[map] = {};
            const variants = await getFilesFrom(path);
            for (const [index, variant] of Object.entries(variants)) {
                const variantData = await readParsed(`${path}/${variant}`);
                this.locations[map][index] = variantData?.Location ? variantData.Location : variantData;
            }
        }
    }

    /**
     * Load the weather data from JSON
     */
    async setWeather() {
        const weather = await readParsed('./assets/database/weather.json');
        this.weather = weather?.data ? weather.data : weather;
    }

    /**
     * Load the customization data from JSON
     */
    async setCustomizations() {
        const customization = await readParsed(`./assets/database/customization.json`);
        this.customization = customization?.data ? customization.data : customization;
    }

    /**
     * Load the editions data (character bear & usec, storage preset) from JSON
     */
    async setEditions() {
        const editionDirectory = await getDirectoriesFrom(`./assets/database/editions/`, false);
        for (const editionType of editionDirectory) {
            const path = `./assets/database/editions/${editionType}/`;
            const editionData = { id: editionType };

            if (!await fileExist(`${path}character_bear.json`)) {
                logger.error(`${path}character_bear.json does not exist!`);
                return;
            }

            editionData.bear = await readParsed(`${path}character_bear.json`);

            if (!await fileExist(`${path}character_usec.json`)) {
                logger.error(`${path}character_bear.json does not exist!`);
                return;
            }

            editionData.usec = await readParsed(`${path}character_usec.json`);

            if (!await fileExist(`${path}storage.json`)) {
                logger.error(`${path}storage.json does not exist!`);
                return;
            }

            editionData.storage = await readParsed(`${path}storage.json`);

            this.editions[editionType] = editionData;
        }
    }

    /**
     * Load the presets data from globals, create list of presets based on tpl of item
     */
    async setPresets() {
        const presets = Object.values(this.core.globals.ItemPresets);
        for (const preset of presets) {
            const tpl = preset._items[0]._tpl;

            if (!(tpl in this.presets)) {
                this.presets[tpl] = [];
            }
            this.presets[tpl][preset._id] = preset;
        }
    }

    async setMods() {
        const dirPath = `/user/mods`;
        const modDirectory = await getDirectoriesFrom(dirPath)
        if (!modDirectory) {
            return createDirectory(dirPath);
        }

        const mods = await fileExist(`${dirPath}/mods.json`, true)
            ? await readParsed(`${dirPath}/mods.json`, true)
            : await writeFile(`${dirPath}/mods.json`, stringify({}));

        for (const mod of modDirectory) {
            const modPath = `${dirPath}/${mod}`;
            /* 
                        const rootDir = await getDirectoriesFrom(modPath, true);
                        if (!rootDir.includes("src")) { //Some of AKI mods do not have a SRC. DONT FORGET KING.
                            logger.error(`[${mod}] does not include src directory, invalid mod!`);
                            continue;
                        }
             */
            const rootFiles = await getFilesFrom(modPath, true);

            if (!rootFiles.includes('package.json')) {
                logger.error(`[${mod}] does not include package.json, invalid mod!`);
                continue;
            }
            const packagePath = `${modPath}/package.json`
            const packageInfo = await readParsed(packagePath, true);

            if (!mods[packageInfo.name]) {
                mods[packageInfo.name] = await this.generateModInfo(packageInfo)
            }

            const modInfo = mods[packageInfo.name];
            if (modInfo.isAKImod) {
                logger.info(`[${packageInfo.name}] is an SPT-AKI server mod, skipping ${getModTimeFormat()}`);
                continue;
            }

            await this.modVersionCheck(modInfo);
        }

        await writeFile(`${dirPath}/mods.json`, stringify(mods), true);
        this.mods = mods;
    }

    async generateModInfo(packageInfo) {
        const output = {
            author: packageInfo.author,
            version: packageInfo.version,
            main: "",
            isAKImod: null,
            log: []
        }

        if (packageInfo?.akiVersion) {
            output.isAKImod = true;
            output.log.unshift(`[${packageInfo.name}] is an SPT-AKI server mod, skipping ${getModTimeFormat()}`);
            return output;
        }

        //lets see if we can read ts files
        const srcPath = await fileExist(`${modPath}/src`) ? `${modPath}/src` : modPath;
        const srcFiles = await getFilesFrom(srcPath, true);

        if (srcFiles.includes("mod.ts")) {
            output.main = `${srcPath}/mod.ts`;
            output.log.unshift(`[${packageInfo.name}] is written in TypeScript (.ts) and cannot be compiled/transpiled ${getModTimeFormat()}`);
            logger.error(`[${packageInfo.name}] is written in TypeScript (.ts) and cannot be compiled/transpiled ${getModTimeFormat()}`);
            return output;
        }
        else if (srcFiles.includes("mod.js")) {
            output.main = `${srcPath}/mod.js`;
            output.log.unshift(`[${packageInfo.name}] was added on ${getModTimeFormat()}`);
            logger.info(`[${packageInfo.name}] was added on ${getModTimeFormat()}`);
            return output;
        }
    }

    async modVersionCheck(modInfo) {
        if (modInfo.version !== packageInfo.version) {
            let type = "";
            if (modInfo.version > packageInfo.version) {
                logger.info(`[${packageInfo.name}] has been downgraded since last server start`);
                type = "downgraded"
            }
            else if (modInfo.version < packageInfo.version) {
                logger.info(`[${packageInfo.name}] has been updated since last server start`);
                type = "updated"
            }
            modInfo.log.unshift(`[${packageInfo.name}] was ${type} on ${getModTimeFormat()}`);
            if (modInfo.log.length > 5) {
                modInfo.log.splice(6, 1);
            }
        }
    }

    /**
     * Load the profiles data from the user/profiles directory, save the file age in the database for saving purpose
     */
    async setProfiles() {
        const profileDirectory = await getDirectoriesFrom(`./user/profiles/`, false);
        if (!profileDirectory) {
            return createDirectory(`./user/profiles/`);
        }

        if (profileDirectory.length === 0) return;

        for (const profileID of profileDirectory) {
            const profilePath = `./user/profiles/${profileID}/`;
            this.fileAge[profileID] = {};
            this.profiles[profileID] = {
                raid: {
                    lastLocation: {
                        name: "",
                        insurance: false
                    },
                    carExtracts: 0
                }
            };

            await Promise.allSettled([
                await this.setCharacter(profilePath, profileID),
                await this.setAccount(profilePath, profileID),
                await this.setStorage(profilePath, profileID),
                await this.setDialogues(profilePath, profileID),
                await this.setSpecial(profilePath, profileID),
            ]);
        }
    }

    async setAccount(profilePath, profileID) {
        if (await fileExist(`${profilePath}account.json`, true)) {
            this.profiles[profileID].account = await readParsed(`${profilePath}account.json`);
            this.fileAge[profileID].account = await getFileUpdatedDate(`${profilePath}account.json`);
            if (Object.keys(this.profiles[profileID].account).length === 0)
                logger.error(`Loading account data for profile ${profileID} failed`);
            else
                logger.info(`Loaded account data for profile ${profileID}`);
        }
    }

    async setCharacter(profilePath, profileID) {
        if (await fileExist(`${profilePath}character.json`, true)) {
            this.profiles[profileID].character = await readParsed(`${profilePath}character.json`);
            this.fileAge[profileID].character = await getFileUpdatedDate(`${profilePath}character.json`);
            if (Object.keys(this.profiles[profileID].character).length === 0)
                logger.error(`Loading character data for profile ${profileID} failed`);
            else
                logger.info(`Loaded character data for profile ${profileID}`);
        }
    }

    async setStorage(profilePath, profileID) {
        if (await fileExist(`${profilePath}storage.json`, true)) {
            this.profiles[profileID].storage = await readParsed(`${profilePath}storage.json`);
            this.fileAge[profileID].storage = await getFileUpdatedDate(`${profilePath}storage.json`);
            if (!this.profiles[profileID]?.storage?._id)
                logger.error(`Loading storage data for profile ${profileID} failed`);
            else
                logger.info(`Loaded storage data for profile ${profileID}`);
        }
    }

    async setDialogues(profilePath, profileID) {
        if (await fileExist(`${profilePath}dialogues.json`, true)) {
            this.profiles[profileID].dialogues = await readParsed(`${profilePath}dialogues.json`);
            this.fileAge[profileID].dialogues = await getFileUpdatedDate(`${profilePath}dialogues.json`);
            if (!this.profiles[profileID]?.dialogues)
                logger.error(`Loading dialogue data for profile: ${profileID} failed`);
            else
                logger.info(`Loaded dialogue data for profile: ${profileID}`);
        }
    }

    async setSpecial(profilePath, profileID) {
        if (await fileExist(`${profilePath}special.json`, true)) {
            this.profiles[profileID].special = await readParsed(`${profilePath}special.json`);
            this.fileAge[profileID].special = await getFileUpdatedDate(`${profilePath}special.json`);
            if (!this.profiles[profileID]?.special?.lastCyclicUpdate)
                logger.error(`Loading special data for profile: ${profileID} failed!`);
            else
                logger.info(`Loaded special data for profile: ${profileID}`);
        } else {
            this.profiles[profileID].special = {};
            if (!this.fileAge[profileID])
                this.fileAge[profileID] = {};

            this.fileAge[profileID].special = 0; //undefined if there's nothing
        }
    }
}


class DatabaseUtils {
    /**
     * Update each Globals parameter based on Gameplay configuration file
     * @param {object} globals
     * @param {object} gameplay
     */
    static async adjustGlobals(globals, gameplay) {
        const config = globals.config;

        //flea
        config.RagFair.enabled = gameplay.trading.flea.enabled;
        config.RagFair.minUserLevel = gameplay.trading.flea.minUserLevel;
        config.handbook.defaultCategory = "";

        //raid
        config["AllowSelectEntryPoint"] = gameplay.raid.allowSelectEntryPoint;
        [config.TimeBeforeDeploy, config.TimeBeforeDeployLocal] =
            [
                gameplay.raid.timeBeforeDeploy,
                gameplay.raid.timeBeforeDeploy
            ];

        //bots
        config.MaxBotsAliveOnMap = gameplay.raid.maxBotsAliveOnMap;
        [config.WAVE_COEF_LOW, config.WAVE_COEF_MID, config.WAVE_COEF_HIGH, config.WAVE_COEF_HORDE] =
            [
                gameplay.raid.waveCoef.low,
                gameplay.raid.waveCoef.mid,
                gameplay.raid.waveCoef.high,
                gameplay.raid.waveCoef.horde
            ];

        globals.HealthEffect = null;
    }

    /**
     * Update each items parameters based on Gameplay configuration file
     * @param {object} gameplay
     * @param {object} items
     */
    static async adjustItems(gameplay, items) {
        for (const item of Object.values(items)) {
            if (gameplay.items.inRaidModding) {
                if (item?._props?.RaidModdable)
                    item._props.RaidModdable = true;
                if (item?._props?.ToolModdable)
                    item._props.ToolModdable = true;
            }

            const isAmmo = item._parent === "5485a8684bdc2da71d8b4567";
            if (isAmmo && gameplay.items.stackSize.ammo)
                item._props.StackMaxSize = gameplay.items.stackSize.ammo;

            // special SLOTS
            const isPocket = item._parent === "557596e64bdc2dc2118b4571";
            if (isPocket && item?._props?.Slots
                && gameplay.items.allPocketsHaveSpecialSlots) {
                item._props.Slots = [];
                for (const slot of ["SpecialSlot1", "SpecialSlot2", "SpecialSlot3"]) {
                    const specialSlot = {
                        "_name": slot,
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
                    };
                    item._props.Slots.push(specialSlot);
                }
            }

            if (gameplay.items.quickExamine && item?._props?.ExamineTime)
                item._props.ExamineTime = 0;

            if (gameplay.items.allExamined.enabled
                && !gameplay.items.allExamined.exceptTheseParents.includes(item._parent)
                && !item?._props?.ExaminedByDefault)
                item._props.ExaminedByDefault = true;

            if (gameplay.items.stackSize.money && item._parent === "543be5dd4bdc2deb348b4569")
                item._props.StackMaxSize = gameplay.items.stackSize.money;

            const isStim = item._parent === "5448f3a14bdc2d27728b4569" && item?._props.ItemSound === "med_stimulator" || item._parent === "5448f3a64bdc2d60728b456a";
            if (isStim && gameplay.items.stimMaxUses)
                item._props.MaxHpResource = gameplay.items.stimMaxUses;

            if (gameplay.items.noArmorRestrictions && item?._props?.BlocksArmorVest)
                item._props.BlocksArmorVest = false;

            if (gameplay.items.Weight.enabled && item._props.Weight > 0)
                item._props.Weight = item._props.Weight * gameplay.items.Weight.modifier;
        }
    }

    /**
     * Update each locales parameters based on Gameplay configuration file
     * @param {object} gameplay
     * @param {object} locales
     */
    static async adjustLocales(gameplay, locales) {
        if (!gameplay.customization.allHeadsOnCharacterCreation && !gameplay.customization.allVoicesOnCharacterCreation)
            return;

        const extras = await readParsed(`./assets/database/locales/extras.json`);
        for (const language in locales) {
            const locale = locales[language];
            if (gameplay.customization.allHeadsOnCharacterCreation) {
                for (const [objectId, object] of Object.entries(extras.customization.Voices)) {
                    for (const [property, value] of Object.entries(object)) {
                        locale.locale[`${objectId} ${property}`] = value;
                    }
                }
            }
            if (gameplay.customization.allVoicesOnCharacterCreation) {
                for (const [objectId, object] of Object.entries(extras.templates)) {
                    for (const [property, value] of Object.entries(object)) {
                        locale.locale[`${objectId} ${property}`] = value;
                    }
                }
                for (const [objectId, object] of Object.entries(extras.customization.Heads)) {
                    for (const [property, value] of Object.entries(object)) {
                        locale.locale[`${objectId} ${property}`] = value;
                    }
                }
            }
        }
    }

    static async adjustLanguages() { return; }

    static async adjustQuests() { return; }

    static async adjustWeather() { return; }

    /**
     * Update each hideout parameters based on Gameplay configuration file
     * @param {object} gameplay
     * @param {object} hideout
     */
    static async adjustHideout(gameplay, hideout) {
        if (!gameplay.hideout.fastProduction && !gameplay.hideout.fastScavcase)
            return;
        if (gameplay.hideout.fastProduction) {
            for (const production of Object.values(hideout.productions)) {
                production.productionTime = 100;
            }
        }
        if (gameplay.hideout.fastScavcase) {
            for (const scavcase of Object.values(hideout.scavcase)) {
                scavcase.ProductionTime = 100;
            }
        }
    }

    /**
     * Update each locations parameters based on Gameplay configuration file
     * @param {object} gameplay
     * @param {object} location
     */
    static async adjustLocations(gameplay, locations) {
        if (!gameplay.location.changeRaidTime && !gameplay.location.changeExfiltrationTime)
            return;

        for (const id in locations) {
            const location = locations[id];

            if (gameplay.location.changeRaidTime && gameplay.location.raidTimerMultiplier)
                location.EscapeTimeLimit *= gameplay.location.raidTimerMultiplier;

            if (gameplay.location.changeExfiltrationTime && location.exits.length !== 0) {
                for (const exit of location.exits) {
                    exit.ExfiltrationTime = gameplay.location.exfiltrationTime;
                }
            }
        }
    }

    /**
     * Update each customizations parameters based on Gameplay configuration file
     * @param {object} gameplay
     * @param {object} customizations
     */
    static async adjustCustomizations(gameplay, customizations) {
        if (!gameplay.customization.allHeadsOnCharacterCreation && !gameplay.customization.allVoicesOnCharacterCreation)
            return;

        for (const customization of Object.values(customizations)) {
            const isHead = customization._type !== "Node" && customization._props.BodyPart === "Head";
            if (gameplay.customization.allHeadsOnCharacterCreation && isHead)
                customization._props.Side = ["Bear", "Usec", "Savage"];

            const isVoices = customization._type !== "Node" && customization._parent === "5fc100cf95572123ae738483";
            if (gameplay.customization.allVoicesOnCharacterCreation && isVoices)
                customization._props.Side = ["Bear", "Usec", "Savage"];
        }
    }

    /**
     * Update each template parameter based on called functions
     * @param {object} templates
     */
    static async adjustTemplates(templates) {
        await Promise.allSettled([
            await this.adjustHandBook(templates.Handbook),
            await this.adjustPriceTable(templates.priceTable)
        ]);
    }

    /**
     * Update each handbook parameters
     * @param {object} handbook
     */
    static async adjustHandbook(handbook) {
        for (const item of handbook.Items) {
            if (item.Id === "639346cc1c8f182ad90c8972") {
                if (item.ParentId !== "5b5f6f6c86f774093f2ecf0b") {
                    logger.warn(`Tasmanian Tiger Trooper 35 is mis-categorized, fixing`);
                    item.ParentId = "5b5f6f6c86f774093f2ecf0b";
                }
                break;
            }
        }
    }

    static async adjustPriceTable() { return; }

    static async adjustEditions() { return; }

    static async adjustPresets() { return; }

    /**
     * Update each bot parameter based on called functions
     * @param {object} bot
     */
    static async adjustBots(bot) {
        await Promise.allSettled([
            await this.adjustBotCore(),
            await this.adjustBotNames(),
            await this.adjustBotAppearance(),
            await this.adjustPlayerScav(),
            await this.adjustWeaponCache()
        ]);
        //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));

        for (const [key, value] of Object.entries(bot.bots)) {
            await Promise.allSettled([
                await this.adjustBotHealth(),
                await this.adjustBotDifficulties(),
                await this.adjustLoadout()
            ]);
            //.then((results) => results.forEach((result) => logger.info(`${result.status}, ${result.reason}`)));
        }
    }

    static async adjustBotCore() { return; }
    static async adjustBotNames() { return; }
    static async adjustBotAppearance() { return; }
    static async adjustPlayerScav() { return; }
    static async adjustWeaponCache() { return; }
    static async adjustBotHealth() { return; }
    static async adjustBotDifficulties() { return; }
    static async adjustLoadout() { return; }

    static async adjustFlea() { return; }

    static async adjustProfiles(profiles) {
        for (const profileID in profiles) {
            const user = profiles[profileID];
            user.richPresense = {
                state: null,
                details: null,
                startTimestamp: null,
                largeImageKey: "logo",
                largeImageText: "Make Tarkov Great Again",
            }
            if (user?.character?.Info.Side) {
                const character = user.character.Info;
                user.richPresense.smallImageKey = character.Side.toLowerCase();
                user.richPresense.smallImageText = `Level: ${character.Level} | Side: ${character.Side.toUpperCase()}`;
            }
        }
    }
}
export default new Database(); //clear all processes in debug, and remove some of the unneeded breakpoints


const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const {
    generateMongoID,
    logger,
    getRandomInt,
    getRandomFromArray,
    getRandomFromObject,
    getPercentRandomBool,
    round,
    shuffleArray,
    writeFile,
    stringify,
    getRandomSplitInt,
    cloneDeep,
    readParsed
} = require("../utilities");
const { database: {
    core: {
        botTemplate,
        gameplay: {
            development: { debugBots },
            bot,
            bots: {
                randomAmmos,
                preload: {
                    minBossPreload,
                    maxBossPreload,
                    maxFollowerPreload,
                    minFollowerPreload,
                    minScavPreload,
                    maxScavPreload,
                    limiter }
            } } } } } = require("../../app");



class Bot extends BaseModel {
    constructor() {
        super();
    }

    static async initializeBot() {
        const bot = new Bot();
        bot.template = await cloneDeep(botTemplate);
        return bot;
    }

    async setIds(id) {
        this.template._id = id;
        this.template.aid = id;
    }

    async setInfo(newInfo) {
        this.template.Info = newInfo;
    }

    async setCustomization(newCustomization) {
        this.template.Customization = newCustomization;
    }

    async setHealth(newHealth) {
        this.template.Health = newHealth;
    }

    async setInventory(newInventory) {
        this.template.Inventory = newInventory;
    }

    /**
     * Preload tuned amount of each bot type & difficulty upon database load
     * @returns
     */
    static async initializeBotPreload() {
        const { database: { bot } } = require('../../app');

        const bots = bot.bots
        const boss = ["followerBirdEye", "followerBigPipe", "followerTagilla", "bossTagilla", "bossSanitar", "bossKnight", "bossGluhar", "bossBully", "sectantPriest", "bossKilla"]

        const follower = ["followerBully", "followerGluharAssault", 'followerGluharScout',
            'followerGluharSecurity', 'followerKojaniy', 'followerSanitar',
            'marksman', 'sectantWarrior'];


        const output = {};
        let count = 0;
        await logger.info(`Preloading bots...`)
        for (const bot in bots) {
            let max;
            if (boss.includes(bot)) max = maxBossPreload;
            else if (follower.includes(bot)) max = maxFollowerPreload;
            else max = maxScavPreload;

            if (max > limiter) {
                await logger.warning(`Your max is higher than the set limiter. Increase at own risk!`)
                max = limiter;
            }
            count += max;

            const type = bots[bot];
            if (!type?.authorizedGear) continue;
            output[bot] = {};
            for (const difficulty in type.difficulty) {
                output[bot][difficulty] = [];
                output[bot][difficulty].push(...await this.generateBots(null,
                    [{
                        Role: bot,
                        Limit: max,
                        Difficulty: difficulty
                    }]
                ));
            }
        }
        await logger.success(`${count} Bots preloaded!`)
        return output;
    }

    static async regeneratePreloadedBots() {
        const { database: { bot: { preload } } } = require('../../app');

        const boss = ["followerBirdEye", "followerBigPipe", "followerTagilla", "bossTagilla", "bossSanitar", "bossKnight", "bossGluhar", "bossBully", "sectantPriest", "bossKilla"];

        const follower = ["followerBully", "followerGluharAssault", 'followerGluharScout',
            'followerGluharSecurity', 'followerKojaniy', 'followerSanitar',
            'marksman', 'sectantWarrior'];

        for (const bot in preload) {
            let min, max;
            switch (true) {
                case boss.includes(bot):
                    [min, max] = [minBossPreload, maxBossPreload];
                    break;
                case follower.includes(bot):
                    [min, max] = [minFollowerPreload, maxFollowerPreload];
                    break;
                default:
                    [min, max] = [minScavPreload, maxScavPreload];
                    break;
            };

            if (max > limiter) {
                await logger.warning(`Your max is higher than the set limiter. Increase at own risk!`)
                max = limiter;
            }

            const type = preload[bot];
            for (const difficulty in type) {
                const typeDifficulty = type[difficulty];
                const remainder = Object.keys(typeDifficulty).length;

                if (remainder > min) continue;
                else {
                    const sum = max - remainder
                    typeDifficulty.push(
                        await this.generateBots(null,
                            { Role: bot, Limit: sum, Difficulty: difficulty })
                    );
                    await logger.info(`Regenerated ${sum} ${difficulty} ${bot} bots to cache`)
                }
            }
        }
    }

    static async usePreloadedBots(request) {
        const { database: { bot: { preload } } } = require('../../app');
        const botsParameters = request.body.conditions;
        const output = [];

        for (const botParameter of botsParameters) {
            const {
                Role,
                Limit,
                Difficulty
            } = botParameter;

            const remainder = Object.keys(preload[Role][Difficulty]).length;
            if (remainder > Limit) output.push(...preload[Role][Difficulty].splice(0, Limit));
            else {
                const sum = Limit - remainder;
                output.push(
                    ...preload[Role][Difficulty].splice(0, remainder),
                    ...await this.generateBots(null,
                        { Role: Role, Limit: sum, Difficulty: Difficulty })
                );
            }
        }
        return output;
    }

    /**
     * Generate a list of bot corresponding to the give conditions in request
     * @param {Request} request
     * @param {Reply} reply
     */
    static async generateBots(request = null, preload = null) {
        const { database: { bot } } = require("../../app")
        const botsParameters = request ? request.body.conditions : preload;
        //await logger.info(botsParameters);

        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const { Role, Limit, Difficulty } = botParameter;

            for (let i = 0; i < Limit; i++) {
                const newBot = await this.initializeBot();
                const id = await generateMongoID();
                await Promise.allSettled([
                    newBot.setIds(id),
                    newBot.generateInfo(bot, Role, Difficulty),
                    newBot.generateCustomization(bot, Role),
                    newBot.generateHealth(bot, Role, Difficulty),
                    newBot.generateInventory(bot, Role)
                ])
                generatedBots.push(newBot.template);
            }
        }
        return generatedBots;
    }

    async generateInfo(botInfo, role, difficulty) {
        const templateInfo = this.template.Info;

        //if (role === "pmcBot") await logger.debug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

        templateInfo.Nickname = await this.generateNickname(botInfo, role);
        templateInfo.Side = "Savage";
        templateInfo.Voice = await this.generateVoice(botInfo, role);
        templateInfo.Settings = await this.generateSettings(templateInfo.Settings, role, difficulty);

        await this.setInfo(templateInfo);
    }

    async generateNickname(botInfo, role) {
        if (botInfo.names[role]) {
            if (botInfo.names[role].length > 1)
                return getRandomFromArray(botInfo.names[role]);
            else
                return botInfo.names[role][0];
        }
        else {
            let choice;
            switch (role) {
                case "exUsec":
                case "pmcBot":
                case "followerGluharSecurity":
                case "followerGluharScout":
                case "followerGluharAssault":
                case "followerGluharSnipe":
                case "followerStormtrooper":
                    choice = getRandomFromArray(botInfo.names.generalFollower);
                    return choice;

                case "usec": case "bear":
                    choice = getRandomFromArray(botInfo.names.normal);
                    return choice;

                default:
                    choice = getRandomFromArray(botInfo.names.scav);
                    return choice;
            }
        }
    }

    async generateVoice(botInfo, role) {
        let voice;
        if (botInfo.appearance[role]) {
            if (typeof botInfo.appearance[role].Voice !== "string") {
                voice = await getRandomFromObject(botInfo.appearance[role].Voice);
                return voice;
            }
            else {
                voice = botInfo.appearance[role].Voice
                return voice;
            }
        } else {
            switch (role) {
                case "assault":
                case "cursedAssault":
                case "marksman":
                    voice = await getRandomFromObject(botInfo.appearance.scav.Voice);
                    return voice;

                case "followerGluharSecurity":
                case "followerGluharAssault":
                case "followerGluharScout":
                    voice = await getRandomFromObject(botInfo.appearance.followerGluhar.Voice);
                    return voice;

                default:
                    voice = await getRandomFromObject(botInfo.appearance.random.Voice);
                    return voice;
            }
        }
    }

    async generateSettings(settings, role, difficulty) {
        settings.Role = role;
        settings.BotDifficulty = difficulty;

        switch (role) {
            case "assault": case "cursedAssault": case "marksman":
                [settings.StandingForKill, settings.AggressorBonus] = [-0.02, 0.01];
                break;

            case "bossBully": case "followerBully": case "bossSanitar":
            case "bossKilla": case "bossGluhar": case "bossKojaniy":
            case "bossTagilla": case "followerKilla":
                [settings.StandingForKill, settings.AggressorBonus] = [-0.2, 0.05];
                break;

            case "followerBirdEye": case "followerBigPipe": case "exUsec":
            case "bossKnight": case "sectantWarrior": case "sectantPriest":
            case "followerTest": case "followerTagilla": case "pmcBot":
            case "followerGluharSnipe": case "followerGluharScout":
            case "followerGluharSecurity": case "followerGluharAssault":
            case "followerKojaniy": case "followerSanitar":
                [settings.StandingForKill, settings.AggressorBonus] = [0, 0];
                break;

            case "usec": case "bear":
                [settings.StandingForKill, settings.AggressorBonus] = [0.01, 0.02];
                break;

            case "gifter":
                [settings.StandingForKill, settings.AggressorBonus] = [-0.3, 0.15];
                break;

            default:
                await logger.info(`[Bot : generateSettings] Role [${role}] settings not handled`);
                [settings.StandingForKill, settings.AggressorBonus] = [0, 0];
                break;
        }

        settings.Experience = await this.generateExperience(role);
        return settings;
    }

    async generateExperience(role) {
        switch (role) {
            case "sectantPriest": case "bossKilla":
            case "bossZryachiy": case "followerZryachiy":
                return 1200;
            case "bossKojaniy":
                return 1100;
            case "followerBirdEye": case "followerBigPipe": case "followerTagilla":
            case "bossTagilla": case "bossSanitar": case "bossKnight":
            case "bossGluhar": case "bossBully":
                return 1000;
            case "usec":
            case "bear":
                return getRandomInt(250, 1000);
            case "followerSanitar": case "followerKojaniy": case "sectantWarrior":
                return 600;
            case "followerGluharSecurity": case "followerGluharAssault":
                return 500;
            case "followerGluharScout": case "followerBully": case "bossTest":
                return 300;
            case "exUsec":
                return 225;
            case "assault": case "cursedAssault":
            case "marksman": case "gifter":
                return -1
            default:
                //await logger.info(`[Bot : generateExperience] Role [${role}] experience not handled`);
                return 0;
        }
    }

    async generateCustomization(botInfo, role) {
        const templateCustomization = this.template.Customization;

        if (botInfo.appearance[role]) {
            templateCustomization.Head = typeof botInfo.appearance[role].Head !== "string"
                ? await getRandomFromArray(botInfo.appearance[role].Head)
                : botInfo.appearance[role].Head;

            templateCustomization.Body = typeof botInfo.appearance[role].Body !== "string"
                ? await getRandomFromArray(botInfo.appearance[role].Body)
                : botInfo.appearance[role].Body;

            templateCustomization.Hands = typeof botInfo.appearance[role].Hands !== "string"
                ? await getRandomFromArray(botInfo.appearance[role].Hands)
                : botInfo.appearance[role].Hands;

            templateCustomization.Feet = typeof botInfo.appearance[role].Feet !== "string"
                ? await getRandomFromArray(botInfo.appearance[role].Feet)
                : botInfo.appearance[role].Feet;

            return this.setCustomization(templateCustomization);
        }
        else if (["assault", "cursedAssault", "marksman"].includes(role)) {
            templateCustomization.Head = await getRandomFromArray(botInfo.appearance.scav.Head);
            templateCustomization.Body = await getRandomFromArray(botInfo.appearance.scav.Body);
            templateCustomization.Hands = await getRandomFromArray(botInfo.appearance.scav.Hands);
            templateCustomization.Feet = await getRandomFromArray(botInfo.appearance.scav.Feet);

            return this.setCustomization(templateCustomization);
        }
        else if (["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role)) {
            templateCustomization.Head = await getRandomFromArray(botInfo.appearance.followerGluhar.Head);
            templateCustomization.Body = await getRandomFromArray(botInfo.appearance.followerGluhar.Body);
            templateCustomization.Hands = botInfo.appearance.followerGluhar.Hands;
            templateCustomization.Feet = await getRandomFromArray(botInfo.appearance.followerGluhar.Feet);

            return this.setCustomization(templateCustomization);
        }
        else {
            //await logger.error(`Role [${role}] customization not handled, randomizing`);
            templateCustomization.Head = await getRandomFromArray(botInfo.appearance.random.Head);
            templateCustomization.Body = await getRandomFromArray(botInfo.appearance.random.Body);
            templateCustomization.Hands = await getRandomFromArray(botInfo.appearance.random.Hands);
            templateCustomization.Feet = await getRandomFromArray(botInfo.appearance.random.Feet);

            return this.setCustomization(templateCustomization);
        }
    }

    async generateHealth(botInfo, role, difficulty) {
        const health = this.template.Health;

        if (botInfo.bots[role].health && Object.keys(botInfo.bots[role].health).length > 1) {
            health.BodyParts = botInfo.bots[role].health[difficulty].BodyParts;
            return this.setHealth(health);
        }
        else if (botInfo.bots[role].health) {
            health.BodyParts = botInfo.bots[role].health.BodyParts;
            return this.setHealth(health);
        }
        else {
            //await logger.error(`[Bot : generateHealth] Role [${role}] health not handled`);
            health.BodyParts = botInfo.bots["assault"].health["impossible"].BodyParts;
            return this.setHealth(health);
        }
    }

    async generateInventory(botInfo, role) {
        const templateInventory = this.template.Inventory;
        const templateItems = templateInventory.items;


        const equipment = await generateMongoID();
        templateInventory.equipment = equipment;

        const stash = await generateMongoID();
        templateInventory.stash = stash;

        const sortingTable = await generateMongoID();
        templateInventory.sortingTable = sortingTable;

        const questRaidItems = await generateMongoID();
        templateInventory.questRaidItems = questRaidItems;

        const questStashItems = await generateMongoID();
        templateInventory.questStashItems = questStashItems;

        templateItems[0]._id = templateInventory.equipment;
        templateItems[1]._id = templateInventory.stash;
        templateItems[2]._id = templateInventory.sortingTable;
        templateItems[3]._id = templateInventory.questRaidItems;
        templateItems[4]._id = templateInventory.questStashItems;

        const botDefaultInventory = await this.generateInventoryItems(botInfo,
            templateInventory.equipment, role);
        templateItems.push(...botDefaultInventory);

        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(botInfo, parentId, role) {
        const output = [];

        const botPocket = await BotItemGeneration.generateBotPockets(botInfo, parentId, role);
        output.push(botPocket);
        // TODO: generate loot in pockets ? Loose bullets ? Money ? Bandages ? Grenades ?

        const securedContainer = await BotItemGeneration.generateSecuredContainer(parentId);
        output.push(securedContainer);

        const [botVest, armored] = await BotItemGeneration.generateBotVest(botInfo, parentId, role);
        if (botVest)
            output.push(botVest);

        // TODO: generate more loot in the botRig ? meds, valuable...

        if (!armored) {
            const bodyArmor = await BotItemGeneration.generateBotBodyArmor(botInfo, parentId, role);
            if (bodyArmor)
                output.push(bodyArmor);
        }

        const [weapon, ammos, magazines] = await BotItemGeneration.generateBotWeapon(botInfo, parentId, role, "FirstPrimaryWeapon");
        output.push(...weapon);

        let ammo;
        if (Object.keys(magazines).length > 0)
            ammo = await BotItemGeneration.generateAmmoInContainer(
                botVest,
                securedContainer,
                ammos,
                magazines);
        else
            ammo = await BotItemGeneration.generateAmmoInContainer( // put loose rounds in either pocket or vest
                await getRandomFromArray([botPocket, botVest]),
                securedContainer,
                ammos
            );

        output.push(...ammo);

        const botBackpack = await BotItemGeneration.generateBotBackpack(botInfo, parentId, role, bot.backpackChance);
        if (botBackpack)
            output.push(botBackpack);

        // TODO: generate loot in backpack: valuable, hideout items, barter stuff...

        const [helmet, headwearConflicts] = await BotItemGeneration.generateBotHeadwear(botInfo, parentId, role, bot.headwearChance);
        if (helmet)
            output.push(helmet);

        const [facecover, facecoverConflicts] = await BotItemGeneration.generateBotFacecover(botInfo, parentId, role, headwearConflicts, bot.facecoverChance);
        if (facecover)
            output.push(facecover);

        const earpiece = await BotItemGeneration.generateBotEarpiece(botInfo, parentId, role, [...headwearConflicts, ...facecoverConflicts], bot.earpieceChance);
        if (earpiece)
            output.push(earpiece);

        const scabbard = await BotItemGeneration.generateBotMelee(botInfo, parentId, role);
        if (scabbard)
            output.push(scabbard);

        return output;
    }
}

class BotItemGeneration {
    /**
     * Generate a ears protection item based on the gear entries for the bot role
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} final item generate/false
     */
    static async generateBotEarpiece(botInfo, parentId, role, conflictIds, earpieceChance) {
        const earpieces = await BotUtilities.cleanPartList(botInfo.bots[role].weightedGear.earpiece, conflictIds);

        if (earpieces && earpieces.length > 0 && await getRandomInt() <= earpieceChance) {
            const choice = await getRandomFromArray(earpieces);
            const earpieceTemplate = await Item.get(choice);

            const earpiece = await this.createWeaponPart(
                earpieceTemplate,
                "Earpiece",
                parentId
            );
            return earpiece;
        }
        return false;
    }

    /**
     * Generate a facecover item based on the gear entries for the bot role
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<array>} final item generate/false & conflicting items
     */
    static async generateBotFacecover(botInfo, parentId, role, conflictIds, facecoverChance) {
        const facecovers = await BotUtilities.cleanPartList(botInfo.bots[role].weightedGear.facecover, conflictIds);

        if (facecovers && facecovers.length > 0 && await getRandomInt() <= facecoverChance) {
            const choice = await getRandomFromArray(facecovers);
            const facecoverTemplate = await Item.get(choice);

            const facecover = await this.createWeaponPart(
                facecoverTemplate,
                "FaceCover",
                parentId
            );

            return [facecover, facecoverTemplate._props.ConflictingItems];
        }
        return [false, []];
    }

    /**
     * Generate a headwear item based on the gear entries for bot role
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<array>} final item generate/false & conflicting items
     */
    static async generateBotHeadwear(botInfo, parentId, role, headwearChance) {
        const headwears = botInfo.bots[role].weightedGear.headwear;
        if (headwears && headwears.length > 0 && await getRandomInt() <= headwearChance) {
            const choice = await getRandomFromArray(headwears);
            const headwearTemplate = await Item.get(choice);

            const headwear = await this.createWeaponPart(
                headwearTemplate,
                "Headwear",
                parentId
            );
            return [headwear, headwearTemplate._props.ConflictingItems];
        }
        return [false, []];
    }

    /**
     * Generate a body armor item based on the gear entries for bot role
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} final item generated or false
     */
    static async generateBotBodyArmor(botInfo, parentId, role) {
        const bodyArmor = botInfo.bots[role].weightedGear.bodyArmor;
        if (bodyArmor && bodyArmor.length > 0) {
            const choice = await getRandomFromArray(bodyArmor);
            const armorTemplate = await Item.get(choice);
            const armor = await this.createWeaponPart(
                armorTemplate,
                "ArmorVest",
                parentId
            );
            return armor;
        }
        //await logger.warn("[BotItemGeneration.generateBotGear.generateBotBodyArmor] Bot loadout doesn't have any body armor available.");
        return false;
    }

    /**
     * Pick it and generate a new vest.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} final item generated or false
     */
    static async generateBotVest(botInfo, parentId, role) {
        const vest = botInfo.bots[role].weightedGear.vest;
        // pick the itemID to generate
        if (vest && vest.length > 0) {
            const choice = await getRandomFromArray(vest);
            const vestTemplate = await Item.get(choice);

            const botVest = await this.createWeaponPart(
                vestTemplate,
                "TacticalVest",
                parentId
            );
            return [botVest, vestTemplate._props.BlocksArmorVest];
        }
        //await logger.warn("[BotItemGeneration.generateBotGear.generateBotRig] Bot loadout doesn't have any vest available.");
        return [false, false];
    }

    static async generateBotMelee(botInfo, parentId, role) {
        const melee = botInfo.bots[role].weightedGear.melee;

        let scabbard;
        if (melee && melee.length > 0)
            scabbard = await getRandomFromArray(melee);
        else
            scabbard = "57e26ea924597715ca604a09";

        const scabbardItem = await this.createWeaponPart(
            scabbard,
            "Scabbard",
            parentId
        );

        return scabbardItem;
    }

    static async gearEntriesFail(role, slotId) {
        await logger.warn(`[generateBotWeapon] Bot loadout doesn't have any ${slotId} weapon available., using "assault" as fallback`);
        return
    }

    /**
     * Generate weapon preset based on the gear entries for slot,
     * load the magazine, create a list of compatible mags & ammo.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<array>} list of parts making the weapon, list of compatibles magazines, list of compatibles ammo
     */
    static async generateBotWeapon(botInfo, parentId, role, slotId, ammos = [], magazines = {}) {
        if (!botInfo.weaponCache)
            botInfo.weaponCache = {};

        let weightedGear = []
        weightedGear = botInfo.bots[role].weightedGear;

        switch (slotId) {
            case "Holster":
                weightedGear = weightedGear?.holster.length !== 0
                    ? weightedGear.holster
                    : ["583990e32459771419544dd2"];
                break;
            case "FirstPrimaryWeapon":
                weightedGear = weightedGear?.primaryWeapon.length !== 0
                    ? weightedGear.primaryWeapon
                    : weightedGear?.secondaryWeapon.length !== 0
                        ? weightedGear.secondaryWeapon
                        : ["583990e32459771419544dd2"];
                break;
            default:
                await logger.warn(`[BotItemGeneration.generateBotGear.generateBotWeapon] Bot loadout doesn't have any ${slotId} weapon available.`);
                break;
        }

        const assembledWeapon = [];

        let choice;
        if (weightedGear.length === 1)
            choice = weightedGear[0];
        else
            choice = await getRandomFromArray(weightedGear);

        let cache;
        let write = false;
        if (!botInfo.weaponCache[choice]) {
            botInfo.weaponCache[choice] = {};
            cache = await readParsed(`./assets/database/bot/weaponcache.json`);
        }

        const weapon = await Item.get(choice);
        const firecontrol = await this.createWeaponPart(weapon, slotId, parentId);
        await logger.info(`Firecontrol set with ID ${firecontrol._id}`);
        assembledWeapon.push(firecontrol); //push base of weapon

        if (!botInfo.weaponCache[choice]["parts"]) {
            const { required, optional } = await BotUtilities.generatePartList(weapon);

            botInfo.weaponCache[choice]["parts"] = {};
            botInfo.weaponCache[choice].parts["required"] = required;
            botInfo.weaponCache[choice].parts["optional"] = optional;

            Object.assign(cache, botInfo.weaponCache);
            write = true;
        }

        const [required, optional] = [
            botInfo.weaponCache[choice].parts.required,
            botInfo.weaponCache[choice].parts.optional
        ];

        if (weapon._props.weaponUseType === "primary" && slotId == "Holster") {
            await logger.info(`Remove ${weapon._id} from weightedGear.primaryWeapon`);
        } else if (weapon._props.weaponUseType !== "secondary" && slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]) {
            await logger.info(`Remove ${weapon._id} from weightedGear.Holster`);
        }


        if (!botInfo.weaponCache[choice]["ammos"]) {
            botInfo.weaponCache[choice]["ammos"] = await weapon.generateCompatibleAmmoList();

            Object.assign(cache, botInfo.weaponCache);
            if (!write)
                write = true;
        }

        ammos = botInfo.weaponCache[choice].ammos;
        const ammo = await this.selectWeaponPart(ammos);

        if (weapon._props.Chambers.length > 0) {
            // generate patron in weapon if needed
            const chambers = await weapon.generateChambersList();
            const patron_in_weapon = await this.generatePatronInWeapon(chambers, firecontrol._id, ammo);

            assembledWeapon.push(...patron_in_weapon);
        };

        const conflictIds = [];
        const filledAttachments = [];
        let mod_part;

        if (weapon._props.ReloadMode !== "OnlyBarrel") {
            if (!botInfo.weaponCache[choice]["magazines"]) {
                botInfo.weaponCache[choice]["magazines"] = await weapon.generateCompatibleMagazineList(true);
            }
            magazines = botInfo.weaponCache[choice].magazines;

            const filtered = await BotUtilities.cleanPartList(Object.keys(magazines), conflictIds);
            const selected = await this.selectWeaponPart(filtered)
            const magazine = magazines[selected];
            magazine.ammos = magazine.ammos.filter(item => !item.includes(ammos));

            // add magazine to weapon, and fill with ammo
            const anamoly = await Item.get(magazine.id);
            const mod_magazine = await this.createWeaponPart(
                anamoly, "mod_magazine", firecontrol._id, conflictIds);

            if (anamoly?._props?.ReloadMagType === "InternalMagazine") {
                const camoras = await anamoly.generateCamoraList();
                if (camoras.length !== 0) {
                    for (const camora of camoras) {

                        const cartridges = await this.createWeaponPart(
                            ammo,
                            camora,
                            mod_magazine._id
                        );

                        cartridges.upd.StackObjectsCount = 1;
                        assembledWeapon.push(cartridges);
                    }
                } else {

                    const cartridges = await this.createWeaponPart(
                        ammo,
                        "cartridges",
                        mod_magazine._id);

                    cartridges.upd.StackObjectsCount = magazine.count;
                    assembledWeapon.push(cartridges);
                }
                assembledWeapon.push(mod_magazine);
            } else {

                const cartridges = await this.createWeaponPart(
                    ammo,
                    "cartridges",
                    mod_magazine._id
                );

                cartridges.upd.StackObjectsCount = magazine.count;
                assembledWeapon.push(mod_magazine, cartridges);
            }

            if (anamoly?._props?.ReloadMagType === "InternalMagazine") {
                magazines = {};
            }
        }

        const rid = Object.keys(required).sort((a, b) => a.localeCompare(b));
        const loops = rid.length;

        for (let i = 0; i < loops; i++) {
            const require = required[rid[i]];

            mod_part = await this.generateRequiredWeaponPart(
                require,
                firecontrol._id,
                conflictIds,
                filledAttachments
            );

            assembledWeapon.push(...mod_part);
        }

        if (Object.keys(optional).length === 0)
            return [assembledWeapon, ammos, magazines];

        if (filledAttachments.includes("mod_scope") && optional["mod_mount"])
            delete optional["mod_mount"];

        for (const oid in optional) {
            const option = optional[oid];

            mod_part = await this.generateOptionalWeaponPart(
                option,
                firecontrol._id,
                conflictIds,
                filledAttachments
            );

            assembledWeapon.push(...mod_part);
        }

        if (!assembledWeapon) {
            await logger.error("ballsack")
        }

        if (write) {
            await writeFile(`./assets/database/bot/weaponcache.json`, stringify(cache));
        }
        return [assembledWeapon, ammos, magazines];
    }

    static async generateRequiredWeaponPart(required, parentId, conflictIds, filledAttachments) {
        const output = [];

        if (required.filter.length === 0)
            return output;

        const filtered = await BotUtilities.cleanPartList(required.filter, conflictIds);

        if (filtered.length === 0)
            return output;


        let part;
        if (filtered.length === 1)
            part = filtered[0];
        else
            part = await this.selectWeaponPart(filtered);

        if (required.slotId === "mod_barrel") { // mosins are bullshit
            await BotUtilities.mosinBarrelClean(part, conflictIds);
        }

        let partList;
        if (await BotUtilities.isBufferTubeOrAdapter(part))
            partList = await BotUtilities.generatePartList(part); // treat stock required
        else
            partList = await BotUtilities.generatePartList(part, false); // treat stock optional

        const mod_part = await this.generateWeaponPart(
            part,
            required.slotId,
            parentId,
            conflictIds,
            filledAttachments,
            partList
        );
        output.push(...mod_part);
        return output;
    }

    static async generateOptionalWeaponPart(optional, parentId, conflictIds, filledAttachments) {
        const output = [];

        if (optional.filter.length === 0)
            return output;

        const filtered = await BotUtilities.cleanPartList(optional.filter, conflictIds);

        if (filtered.length === 0)
            return output;

        let part;
        if (filtered.length === 1)
            part = filtered[0];
        else
            part = await this.selectWeaponPart(filtered);

        const mod_part = await this.generateWeaponPart(
            part,
            optional.slotId,
            parentId,
            conflictIds,
            filledAttachments,
            await BotUtilities.generatePartList(part)
        );
        output.push(...mod_part);
        return output;
    }

    /**
     * Generate inventory item for bot inventory: i.e: weapon, backpack, pockets, etc
     * @param {string} item
     * @param {string} slotId
     * @param {string} parentId
     * @param {[]} conflictIds
     * @returns {<Promise> {}}
     */
    static async createWeaponPart(item, slotId, parentId, conflictIds = null) {

        let itemTemplate;
        if (item?._props)
            itemTemplate = item;
        else
            itemTemplate = await Item.get(item);


        const inventoryItem = await itemTemplate.createAsNewItemWithParent(parentId);
        inventoryItem.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(itemTemplate);

        if (upd !== "error") {
            inventoryItem.upd = upd;
        };

        if (conflictIds) {
            conflictIds.push(...itemTemplate._props.ConflictingItems);
        };

        return inventoryItem;
    }

    /**
     * Generate weapon part and return array of created objects;
     * @param {string} partId 
     * @param {string} slotId 
     * @param {string} parentId 
     * @param {array} conflictIds 
     * @param {array} filledAttachments 
     * @param {array} partList 
     * @returns 
     */
    static async generateWeaponPart(partId, slotId, parentId, conflictIds, filledAttachments = null, partList = null) {
        const output = [];

        let partTemplate;
        if (partId?._props)
            partTemplate = partId;
        else
            partTemplate = await Item.get(partId);

        let required, optional;
        if (partList) {
            required = partList.required;
            optional = partList.optional;
        }
        else {
            partList = await BotUtilities.generatePartList(partTemplate, false);
            required = partList.required;
            optional = partList.optional;
        }

        const parent = await this.createWeaponPart(
            partTemplate,
            slotId,
            parentId,
            conflictIds
        );


        if (optional.hasOwnProperty("mod_sight_front")) {
            required["mod_sight_front"] = optional["mod_sight_front"];
            delete optional["mod_sight_front"];
        }

        if (optional.hasOwnProperty("mod_sight_rear")) {
            required["mod_sight_rear"] = optional["mod_sight_rear"];
            delete optional["mod_sight_rear"];
        }


        switch (true) {
            case Object.keys(required).length > 0:
                const requires = [];
                for (const id in required) {
                    if (required[id].filter.length === 0)
                        break; // first break

                    const filtered = await BotUtilities.cleanPartList(required[id].filter, conflictIds);

                    if (filtered.length === 0)
                        break; // second break

                    let part;
                    if (filtered.length === 1)
                        part = filtered[0];
                    else
                        part = await this.selectWeaponPart(filtered);

                    const mod_required = await this.generateWeaponPart(
                        part,
                        required[id].slotId,
                        parent._id,
                        conflictIds,
                        filledAttachments
                    );
                    filledAttachments.push(id);
                    requires.push(...mod_required);
                }

                if (Object.keys(optional).length === 0) {
                    output.push(parent, ...requires);
                    return output;
                }
                else output.push(...requires);

            case Object.keys(optional).length > 0:
                const options = [];
                for (const id in optional) {
                    if (optional[id].filter.length === 0) break;

                    const filtered = await BotUtilities.cleanPartList(optional[id].filter, conflictIds);

                    if (filtered.length === 0) break; // second break

                    let part;
                    if (filtered.length === 1)
                        part = filtered[0];
                    else
                        part = await this.selectWeaponPart(filtered);

                    let count = 0;
                    let roll = false;
                    switch (id) {
                        case "mod_mount":
                        case "mod_tactical":
                            const list = id === "mod_tactical"
                                ? [
                                    "mod_tactical_000",
                                    "mod_tactical_001",
                                    "mod_tactical_002",
                                    "mod_tactical_003",
                                    "mod_tactical_004"
                                ]
                                : [
                                    "mod_mount_000",
                                    "mod_mount_001",
                                    "mod_mount_002",
                                    "mod_mount_003",
                                    "mod_mount_004",
                                    "mod_mount_005"
                                ];

                            for (const a of list) {
                                if (!filledAttachments.includes(a)) continue;
                                count++;
                            }

                            if (count > 0)
                                roll = await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85) - (5 * count)));
                            else
                                roll = await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85)));

                            if (!roll) break;
                            filledAttachments.push(optional[id].slotId);

                            const mod_tactical = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            options.push(...mod_tactical);
                            break;

                        case "mod_sight_rear":
                            roll = await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85)));

                            const { _props: { Slots } } = await Item.get(part);
                            if ("5beec9450db83400970084fd" !== parent._tpl) {
                                if (Slots[0]?._props.filters[0].Filter.length !== 1 && !roll) break;
                            }
                            const mod_sight_rear = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            options.push(...mod_sight_rear);
                            break;
                        default:
                            roll = await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85)));
                            if (!roll || filledAttachments.includes(optional[id].slotId)) break;

                            filledAttachments.push(id);
                            const mod_optional = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            filledAttachments.push(optional[id].slotId);
                            options.push(...mod_optional);

                            break;
                    };
                }

                // if mount and options is empty, return;
                if (partTemplate === "55818b224bdc2dde698b456f" && options.length === 0) return output;
                output.push(parent, ...options);
                return output;

            default:
                output.push(parent);
                return output;
        };
    }

    /**
     * Generates weighted list to have randomly chosen from, returns itemId
     * @param {[]} filter List of itemIds to choose from
     * @returns {<Promise> string}
     */
    static async selectWeaponPart(filter) {
        filter = filter.filter(item => !BotUtilities.mountsToBlockBecauseTheySuck().includes(item));

        const entries = await Item.createWeightedList(filter);
        const choice = await getRandomFromArray(entries);

        return choice;
    }

    /**
     * Generate `round-in-chamber` for weapon
     * @param {[]} patronNames
     * @param {string} parentId
     * @param {string} ammoId
     * @returns {Promise<[{}]>}
     */
    static async generatePatronInWeapon(patronNames, parentId, ammoId) {
        const output = [];
        for (const name of patronNames) {
            const patronTemplate = await Item.get(ammoId);

            if (!patronTemplate)
                await logger.info("balle")

            const patron = await patronTemplate.createAsNewItemWithParent(parentId);
            patron.slotId = name;
            patron.upd = {
                StackObjectsCount: 1
            };

            output.push(patron);
        }
        return output;
    }


    /**
     * Generate loose ammo, or spare magazines with ammo
     * Place them into containers
     * Return array of objects
     * @param {object} mainContainer 
     * @param {object} secureContainer 
     * @param {array} ammos 
     * @param {array} magazines 
     * @returns {<Promise>array}
     */
    static async generateAmmoInContainer(mainContainer, secureContainer, ammos, magazines = null) {
        randomAmmos.magazineEnabled = false; // feature does not work but i will save for future
        const output = [];

        /**
         * To whomeever deals with this edge case:
         * Adjust for bosses and followers, certain types will realistically carry
         * ammo of the same type
         */
        if (randomAmmos.looseEnabled) {
            const ammoSelection = {};

            let lastchoice;
            for (let i = 0; i < randomAmmos.maxTypes; i++) {
                const choice = await this.selectWeaponPart(ammos);
                if (await getPercentRandomBool(randomAmmos.chance)) {
                    const amount = await getRandomInt(1, 35);
                    if (ammoSelection[choice]) {
                        ammoSelection[choice] += amount;
                        continue;
                    }
                    ammoSelection[choice] = amount;

                } else {
                    if (Object.keys(ammoSelection).length > 0)
                        ammoSelection[await getRandomFromObject(Object.keys(ammoSelection))] += await getRandomInt(1, 35);
                    lastchoice = choice;
                }

            } if (Object.keys(ammoSelection).length === 0) { //incase the bot has shit rolls lol
                ammoSelection[lastchoice] = await getRandomInt(35, 55);
            }

            if (magazines) {
                const magazineSelection = {};
                for (let i = 0; i < await getRandomInt(1, 3); i++) {

                    const [mid, ammo] = [
                        await getRandomFromArray(Object.keys(magazines)),
                        await getRandomFromArray(Object.keys(ammoSelection))
                    ];


                    magazineSelection[mid] = {}
                    if (randomAmmos.magazineEnabled) {
                        const ammosplit = await getRandomSplitInt(magazines[mid].count);
                        for (const split of ammosplit) {
                            if (magazineSelection[mid][ammo]) {
                                magazineSelection[mid][ammo] += split;
                                continue;
                            }
                            magazineSelection[mid][ammo] = split;
                        }
                    } else {
                        magazineSelection[mid][ammo] = magazines[mid].count;
                    }
                }
                const mod_magazine = await this.addMagazinesToContainer(
                    mainContainer,
                    secureContainer,
                    magazineSelection
                );
                output.push(...mod_magazine);

            } else {
                const mod_ammo = await this.addAmmoToContainer(
                    mainContainer,
                    secureContainer,
                    ammoSelection
                );
                output.push(...mod_ammo);
            }
            return output;
        }
        /*         else {
                    const choice = await this.selectWeaponPart(ammos);
        
                    if (magazines) { }
                    else {
                        const mod_ammo = await this.addAmmoToContainer(
                            mainContainer,
                            secureContainer,
                            choices
                        );
                        output.push(...mod_ammo);
                    }
                    return output;
                } */
    }

    /**
     * Place created magazines in container
     * @param {object} mainContainer 
     * @param {object} securedContainer 
     * @param {object} magazines 
     * @returns 
     */
    static async addMagazinesToContainer(mainContainer, securedContainer, magazines) {
        const [main, mainAmmo, sc, scAmmo] = [[], [], [], []];

        for (const [mid, ammos] of Object.entries(magazines)) {
            //create magazine, then add ammo
            const magazine = await Item.get(mid);
            const magSize = await magazine.getSize();

            const mainFreeSlot = await Item.getFreeSlot(
                mainContainer, main, magSize.width, magSize.height
            );

            if (mainFreeSlot) {
                const mod_main_magazine = await this.createMagazineForContainer(
                    mainContainer._id, magazine, mainFreeSlot
                );
                main.push(mod_main_magazine);

                for (const [ammo, amount] of Object.entries(ammos)) {

                    const main_magazine_cartridges = await this.createWeaponPart(
                        ammo,
                        "cartridges",
                        mod_main_magazine._id,
                    );
                    main_magazine_cartridges.upd.StackObjectsCount = amount;
                    mainAmmo.push(main_magazine_cartridges);
                }
            }

            for (let i = 0; i < 2; i++) { // add double the magazines to the sc just incase
                const scFreeSlot = await Item.getFreeSlot(
                    securedContainer, sc, magSize.width, magSize.height
                );

                const mod_sc_magazine = await this.createMagazineForContainer(
                    securedContainer._id, magazine, scFreeSlot
                );
                sc.push(mod_sc_magazine);

                for (const [ammo, amount] of Object.entries(ammos)) {

                    const main_sc_cartridges = await this.createWeaponPart(
                        ammo,
                        "cartridges",
                        mod_sc_magazine._id,
                    );
                    main_sc_cartridges.upd.StackObjectsCount = amount;
                    scAmmo.push(main_sc_cartridges);
                }
            }
        }
        return [...main, ...mainAmmo, ...sc, ...scAmmo];
    }
    /**
     * Creates magazine and grid-coordinates for storage container specified
     * @param {string} parentId 
     * @param {string} magazine 
     * @param {object} freeSlot
     * @returns 
     */
    static async createMagazineForContainer(parentId, magazine, freeSlot) {
        const mod_magazine = await this.createWeaponPart(
            magazine,
            freeSlot.slotId,
            parentId
        )
        mod_magazine.location = {
            x: freeSlot.x,
            y: freeSlot.y,
            r: freeSlot.r,
            isSearched: false
        };
        return mod_magazine;
    }

    /**
     * Place created ammos in container
     * @param {object} mainContainer 
     * @param {object} securedContainer 
     * @param {object} ammos 
     * @returns 
     */
    static async addAmmoToContainer(mainContainer, securedContainer, ammos) {
        const main = [];
        const sc = [];
        for (const [key, value] of Object.entries(ammos)) {
            const aid = await Item.get(key);
            const ammoSize = await aid.getSize();

            const mainFreeSlot = await Item.getFreeSlot(
                mainContainer, main, ammoSize.width, ammoSize.height
            );

            if (mainFreeSlot)
                main.push(
                    await this.createAmmoForContainer(
                        mainContainer._id,
                        aid,
                        mainFreeSlot,
                        value
                    )
                );

            const scFreeSlot = await Item.getFreeSlot(
                securedContainer, sc, ammoSize.width, ammoSize.height
            );

            if (scFreeSlot)
                sc.push(
                    await this.createAmmoForContainer(
                        securedContainer._id,
                        aid,
                        scFreeSlot,
                        value * 2
                    )
                );
        }
        return [...main, ...sc];
    }

    /**
     * Creates ammo and grid-coordinates for storage container specified
     * @param {string} parentId 
     * @param {string} ammo 
     * @param {object} freeSlot 
     * @param {string} amount 
     * @returns 
     */
    static async createAmmoForContainer(parentId, ammo, freeSlot, amount) {
        const mod_ammo = await this.createWeaponPart(
            ammo,
            freeSlot.slotId,
            parentId
        );
        mod_ammo.upd.StackObjectsCount = amount;
        mod_ammo.location = {
            x: freeSlot.x,
            y: freeSlot.y,
            r: freeSlot.r,
            isSearched: false
        };
        return mod_ammo;
    }

    /**
     * Generate pockets based on bot loadout.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} pocket item
     */
    static async generateBotPockets(botInfo, parentId, role) {

        const authorizedGear = botInfo.bots[role].authorizedGear;
        const pocket = authorizedGear?.pocket
            ? await getRandomFromArray(authorizedGear.pocket)
            : "557ffd194bdc2d28148b457f";

        return this.createWeaponPart(
            pocket,
            "Pockets",
            parentId
        );
    }

    /**
     * Generate backpack based on bot gear entries.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} backpack item or false
     */
    static async generateBotBackpack(botInfo, parentId, role, backpackChance) {

        const backpacks = botInfo.bots[role].weightedGear.backpack;
        if (backpacks && backpacks.length > 0 && await getRandomInt() >= backpackChance) {
            const backpack = await getRandomFromArray(backpacks)
            return this.createWeaponPart(
                await Item.get(backpack),
                "Backpack",
                parentId
            );
        }
        return false;
    }

    /**
     * Generate a Boss secured container
     * @param {string} parentId
     * @returns {Promise<object>} newly created Boss SC
     */
    static async generateSecuredContainer(parentId) {
        return this.createWeaponPart(
            "5c0a794586f77461c458f892",
            "SecuredContainer",
            parentId
        );
    }
}

class BotUtilities {

    /**
     * Loop that removes item conflicts from array, returns clean array
     * @param {array} list 
     * @param {array} conflictIds 
     * @returns {<Promise>array}
     */
    static async cleanPartList(list, conflictIds) {
        const output = [];
        for (const id of list) {
            if (conflictIds.includes(id))
                continue;
            else output.push(id);
        }
        return output;
    }

    /**
     * Create object outputting required and optional slots for item
     * @param {string} anamoly item id you need slots for
     * @param {boolean} main default: true, set to false for weapon part
     * @returns {<Promise>{}}
     */
    static async generatePartList(anamoly, main = true) {
        const item = anamoly?._props ? anamoly : await Item.get(anamoly);
        if (!item?._props?.Slots) return false;

        const output = {
            required: {},
            optional: {}
        };

        let name;
        for (const slot of item._props.Slots) {
            if (["mod_magazine", "mod_launcher"].includes(slot._name)) continue;
            if (slot._required === true) {
                switch (true) {
                    case slot._name.includes("mod_pistol_grip"):
                        name = "mod_pistol_grip";
                        break;
                    case slot._name.includes("mod_stock"):
                        name = "mod_stock";
                        break;
                    default:
                        name = slot._name;
                        break;
                };

                output.required[name] = {
                    slotId: slot._name,
                    filter: slot._props.filters[0].Filter
                }
            }
            // these are required for proper bot generation
            else {
                const check = ["mod_reciever", "mod_sight_rear", "mod_sight_front", "mod_stock"].some(
                    condition => slot._name.includes(condition));
                if (main && check) {
                    if (slot._name.includes("mod_stock")) name = "mod_stock"
                    else name = slot._name;

                    output.required[name] = {
                        slotId: slot._name,
                        filter: slot._props.filters[0].Filter
                    }
                } else {
                    switch (true) {
                        case slot._name.includes("mod_mount"):
                            name = "mod_mount";
                            break;
                        case slot._name.includes("mod_tactical"):
                            name = "mod_tactical";
                            break;
                        default:
                            name = slot._name;
                            break;
                    };

                    output.optional[name] = {
                        slotId: slot._name,
                        filter: slot._props.filters[0].Filter
                    }
                }
            }
        }

        return output;
    }

    /**
     * Mounts that bots shouldn't have because they're obnoxious to deal with
     * If someone wants to deal with them in the future, go for it.
     * @returns {<Promise>[]}
     */
    static mountsToBlockBecauseTheySuck() {
        return [
            "5b2389515acfc4771e1be0c0", // Burris AR-P.E.P.R. 30mm ring scope mount
            "618b9643526131765025ab35", // Geissele Super Precision 30mm ring scope mount // needs top to be compatible
            "618bab21526131765025ab3f", // Geissele Super Precision 30mm ring scope mount (DDC)
            "5b3b99265acfc4704b4a1afb", // Nightforce Magmount 30mm ring scope mount
            "5aa66a9be5b5b0214e506e89", // Nightforce Magmount 34mm ring scope mount
            "5aa66c72e5b5b00016327c93", // Nightforce Magmount 34mm ring scope mount with Ruggedized Accessory Platform
            "62811f461d5df4475f46a332", // AI AX-50 34mm scope mount
            "5c86592b2e2216000e69e77c", // IEA Mil-Optics KH/F 34mm one-piece magmount
            "5a37ca54c4a282000d72296a", // JP Enterprises Flat-Top 30mm ring scope mount
            "57c69dd424597774c03b7bbc", // Lobaev Arms 30mm scope mount
            "5dff77c759400025ea5150cf", // Leapers UTG 25mm ring scope mount
            "61713cc4d8e3106d9806c109", // Recknagel Era-Tac 34mm ring scope mount
            "6171407e50224f204c1da3c5", // Recknagel Era-Tac 30mm ring scope mount
            "5d0a29fed7ad1a002769ad08", // KMZ 1P69 Weaver mount
            "5b3b6dc75acfc47a8773fb1e", // Armasight Vulcan universal base
            "5a1ead28fcdbcb001912fa9f", // UNV DLOC-IRD sight mount
        ]
    }

    /**
     * BSG doesn't differentiate stock from buffer tube or adapter, 
     * so this is checked manually below (if any are missing, add to list)
     * @param {string} itemId 
     * @returns {<Promise>boolean}
     */
    static async isBufferTubeOrAdapter(itemId) {
        return [
            "5649b2314bdc2d79388b4576", // AKM/AK-74 ME4 buffer tube adapter
            "5649be884bdc2d79388b4577", // Colt Carbine buffer tube
            "5a33ca0fc4a282000d72292f", // Colt A2 buffer tube
            "5b099bf25acfc4001637e683", // SA-58 buffer tube adapter
            "5bb20e58d4351e00320205d7", // HK Enhanced Tube buffer tube
            "5beec8b20db834001961942a", // RPK-16 buffer tube
            "5bfe89510db834001808a127", // FAB Defense buffer tube for AGR-870
            "5c0faeddd174af02a962601f", // AR-15 ADAR 2-15 buffer tube
            "5cde77a9d7f00c000f261009", // M700 AB Arms MOD*X buffer tube side folder adapter
            "5cf50fc5d7f00c056c53f83c", // AK-74M CAA AKTS AK74 buffer tube
            "5cf518cfd7f00c065b422214", // AKM/AK-74 CAA AKTS buffer tube
            "5ef1ba28c64c5d0dfc0571a5", // Mesa Tactical Crosshair Hydraulic buffer tube
            "602e3f1254072b51b239f713", // Soyuz-TM buffer tube
            "606587e18900dc2d9a55b65f", // CMMG buffer tube
            "617153016c780c1e710c9a2f", // HK G28 buffer tube
            "6197b229af1f5202c57a9bea", // SVDS Lynx Arms Hinge buffer tube adapter
            "628a6678ccaab13006640e49", // AKM/AK-74 RD AK to M4 buffer tube adapter
            "628b9a40717774443b15e9f2", // AK-545 SAG buffer tube
            "5c793fb92e221644f31bfb64", // Strike Industries Advanced Receiver Extension buffer tube
            "5c793fc42e221600114ca25d", // "Strike Industries Advanced Receiver Extension buffer tube (Anodized Red)
            "5afd7e095acfc40017541f61", // SKS TAPCO Intrafuse buffer tube
            "5ae35b315acfc4001714e8b0", // M870 Mesa Tactical LEO stock adapter
            "5bfe7fb30db8340018089fed", // MP-133/153 Taktika Tula 12003 stock adapter
            "5ef1b9f0c64c5d0dfc0571a1", // Mossberg 590A1 Mesa Tactical LEO gen.1 stock adapter
            "5fb655b748c711690e3a8d5a", // KRISS Vector non-folding stock adapter
            "59ecc28286f7746d7a68aa8c", // AKS-74/AKS-74U Zenit PT Lock
            "5ac78eaf5acfc4001926317a", // AK-74M/AK-100 Zenit PT Lock
            "5b222d335acfc4771e1be099", // AKM/AK-74 Zenit PT Lock
        ].includes(itemId);
    }

    /**
     * Mosin barrels don't always have conflicting items, 
     * despite conflicting with stocks. 
     * This is a hard-coded clean for that case, how fun!
     * 
     * If this can be improved, do so.
     * 
     * @param {string} barrelId 
     * @param {array} conflictIds 
     * @returns {array}
     */
    static async mosinBarrelClean(barrelId, conflictIds) {
        const bullshit = {
            "5bbdb870d4351e00367fb67d": [
                "5bfd4cd60db834001c38f095",
                "5bfd4cc90db834001d23e846"
            ],
            "5bfd36ad0db834001c38ef66": [
                "5b3f7bf05acfc433000ecf6b"
            ],
            "5bfd37c80db834001d23e842": [
                "5bfd4cd60db834001c38f095",
                "5bfd4cc90db834001d23e846",
                "5ae09bff5acfc4001562219d"
            ],
            "5bfd384c0db834001a6691d3": [
                "5b3f7bf05acfc433000ecf6b"
            ],
            "5bfd35380db83400232fe5cc": [
                "5b3f7bf05acfc433000ecf6b",
                "5bfd4cbe0db834001b73449f",
                "5bfd4cd60db834001c38f095",
                "5bfd4cc90db834001d23e846"
            ],
            "5bfd36290db834001966869a": [],
            "5ae096d95acfc400185c2c81": [
                "5bfd4cbe0db834001b73449f",
                "5bfd4cd60db834001c38f095",
                "5bfd4cc90db834001d23e846"
            ],
            "5bae13bad4351e00320204af": [
                "5bfd4cd60db834001c38f095",
                "5bfd4cc90db834001d23e846"
            ],
            "5bfd4cbe0db834001b73449f": [
                "5bfd35380db83400232fe5cc",
                "5ae096d95acfc400185c2c81"
            ],
            "5bfd4cd60db834001c38f095": [
                "5bbdb870d4351e00367fb67d",
                "5bfd37c80db834001d23e842",
                "5bfd384c0db834001a6691d3",
                "5bfd35380db83400232fe5cc",
                "5ae096d95acfc400185c2c81",
                "5bae13bad4351e00320204af"
            ],
            "5bfd4cc90db834001d23e846": [
                "5bbdb870d4351e00367fb67d",
                "5bfd37c80db834001d23e842",
                "5bfd384c0db834001a6691d3",
                "5bfd35380db83400232fe5cc",
                "5ae096d95acfc400185c2c81",
                "5bae13bad4351e00320204af"
            ],
            "5ae09bff5acfc4001562219d": [
                "5bfd37c80db834001d23e842",
                "5bfd384c0db834001a6691d3"
            ]
        }
        if (bullshit[barrelId] && bullshit[barrelId].length > 0)
            conflictIds.push(...bullshit[barrelId]);
        return;
    }


    static async mosinEdgeCases(mosin) {
        const output = {};

        for (const slot of mosin._props.Slots) {
            if (["mod_barrel"].includes(slot._name)) {
                if (!output["mod_barrel"]) output["mod_barrel"] = {};

                for (const part of slot._props.filters[0].Filter) {
                    const { _props: { ConflictingItems } } = await Item.get(part);
                    output["mod_barrel"][part] = ConflictingItems;
                }
            }
            if (["mod_stock"].includes(slot._name)) {
                if (!output["mod_stock"]) output["mod_stock"] = {};
                for (const part of slot._props.filters[0].Filter) {
                    const { _props: { ConflictingItems } } = await Item.get(part);
                    output["mod_stock"][part] = ConflictingItems;
                }
            }
        }

        await writeFile("./mosinEdgeCases.json", stringify(output));
        return output;
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;
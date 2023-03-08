const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const {
    generateMongoID,
    logger,
    getRandomInt,
    getRandomFromArray,
    getRandomFromObject,
    getPercentRandomBool,
    writeFile,
    stringify,
    getRandomSplitInt,
    cloneDeep,
    readParsed
} = require("../utilities/index.mjs").default;
/* const { database: {
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
            } } } } } = require("../../app"); */



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
        const { database: { bot } } = require('../../app.mjs');

        const bots = bot.bots
        const boss = ["followerBirdEye", "followerBigPipe", "followerTagilla", "bossTagilla", "bossSanitar", "bossKnight", "bossGluhar", "bossBully", "sectantPriest", "bossKilla"]

        const follower = ["followerBully", "followerGluharAssault", 'followerGluharScout',
            'followerGluharSecurity', 'followerKojaniy', 'followerSanitar',
            'marksman', 'sectantWarrior'];


        const output = {};
        let count = 0;
        logger.info(`Preloading bots...`)
        for (const bot in bots) {
            let max;
            if (boss.includes(bot)) max = maxBossPreload;
            else if (follower.includes(bot)) max = maxFollowerPreload;
            else max = maxScavPreload;

            if (max > limiter) {
                logger.warning(`Your max is higher than the set limiter. Increase at own risk!`)
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
        logger.info(`${count} Bots preloaded!`)
        return output;
    }

    static async regeneratePreloadedBots() {
        const { database: { bot: { preload } } } = require('../../app.mjs');

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
                logger.warning(`Your max is higher than the set limiter. Increase at own risk!`)
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
                    logger.info(`Regenerated ${sum} ${difficulty} ${bot} bots to cache`)
                }
            }
        }
    }

    static async usePreloadedBots(request) {
        const { database: { bot: { preload } } } = require('../../app.mjs');
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
        const { database: { bot } } = require("../../app.mjs")
        const botsParameters = request ? request.body.conditions : preload;

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
                ]);

                generatedBots.push(newBot.template);
            }
        }
        return generatedBots;
    }

    async generateInfo(botInfo, role, difficulty) {
        const templateInfo = this.template.Info;

        //if (role === "pmcBot") logger.warn(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

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
                voice = getRandomFromObject(botInfo.appearance[role].Voice);
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
                    voice = getRandomFromObject(botInfo.appearance.scav.Voice);
                    return voice;

                case "followerGluharSecurity":
                case "followerGluharAssault":
                case "followerGluharScout":
                    voice = getRandomFromObject(botInfo.appearance.followerGluhar.Voice);
                    return voice;

                default:
                    voice = getRandomFromObject(botInfo.appearance.random.Voice);
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
                logger.info(`[Bot : generateSettings] Role [${role}] settings not handled`);
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
                //logger.info(`[Bot : generateExperience] Role [${role}] experience not handled`);
                return 0;
        }
    }

    async generateCustomization(botInfo, role) {
        const templateCustomization = this.template.Customization;

        if (botInfo.appearance[role]) {
            templateCustomization.Head = typeof botInfo.appearance[role].Head !== "string"
                ? getRandomFromArray(botInfo.appearance[role].Head)
                : botInfo.appearance[role].Head;

            templateCustomization.Body = typeof botInfo.appearance[role].Body !== "string"
                ? getRandomFromArray(botInfo.appearance[role].Body)
                : botInfo.appearance[role].Body;

            templateCustomization.Hands = typeof botInfo.appearance[role].Hands !== "string"
                ? getRandomFromArray(botInfo.appearance[role].Hands)
                : botInfo.appearance[role].Hands;

            templateCustomization.Feet = typeof botInfo.appearance[role].Feet !== "string"
                ? getRandomFromArray(botInfo.appearance[role].Feet)
                : botInfo.appearance[role].Feet;

            return this.setCustomization(templateCustomization);
        }
        else if (["assault", "cursedAssault", "marksman"].includes(role)) {
            templateCustomization.Head = getRandomFromArray(botInfo.appearance.scav.Head);
            templateCustomization.Body = getRandomFromArray(botInfo.appearance.scav.Body);
            templateCustomization.Hands = getRandomFromArray(botInfo.appearance.scav.Hands);
            templateCustomization.Feet = getRandomFromArray(botInfo.appearance.scav.Feet);

            return this.setCustomization(templateCustomization);
        }
        else if (["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role)) {
            templateCustomization.Head = getRandomFromArray(botInfo.appearance.followerGluhar.Head);
            templateCustomization.Body = getRandomFromArray(botInfo.appearance.followerGluhar.Body);
            templateCustomization.Hands = botInfo.appearance.followerGluhar.Hands;
            templateCustomization.Feet = getRandomFromArray(botInfo.appearance.followerGluhar.Feet);

            return this.setCustomization(templateCustomization);
        }
        else {
            //logger.error(`Role [${role}] customization not handled, randomizing`);
            templateCustomization.Head = getRandomFromArray(botInfo.appearance.random.Head);
            templateCustomization.Body = getRandomFromArray(botInfo.appearance.random.Body);
            templateCustomization.Hands = getRandomFromArray(botInfo.appearance.random.Hands);
            templateCustomization.Feet = getRandomFromArray(botInfo.appearance.random.Feet);

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
            //logger.error(`[Bot : generateHealth] Role [${role}] health not handled`);
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

        if (magazines) {
            const spareMagazines = await BotItemGeneration.generateAmmoInContainer(
                botVest,
                securedContainer,
                ammos,
                magazines);
            output.push(...spareMagazines);
        }
        else {
            const looseAmmo = await BotItemGeneration.generateAmmoInContainer(
                getRandomFromArray([botPocket, botVest]),
                securedContainer,
                ammos,
            );
            output.push(...looseAmmo);
        }

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

        if (earpieces && earpieces.length > 0 && getRandomInt() <= earpieceChance) {
            const choice = getRandomFromArray(earpieces);
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

        if (facecovers && facecovers.length > 0 && getRandomInt() <= facecoverChance) {
            const choice = getRandomFromArray(facecovers);
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
        if (headwears && headwears.length > 0 && getRandomInt() <= headwearChance) {
            const choice = getRandomFromArray(headwears);
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
            const choice = getRandomFromArray(bodyArmor);
            const armorTemplate = await Item.get(choice);
            const armor = await this.createWeaponPart(
                armorTemplate,
                "ArmorVest",
                parentId
            );
            return armor;
        }
        //logger.warn("[BotItemGeneration.generateBotGear.generateBotBodyArmor] Bot loadout doesn't have any body armor available.");
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
            const choice = getRandomFromArray(vest);
            const vestTemplate = await Item.get(choice);

            const botVest = await this.createWeaponPart(
                vestTemplate,
                "TacticalVest",
                parentId
            );
            return [botVest, vestTemplate._props.BlocksArmorVest];
        }
        //logger.warn("[BotItemGeneration.generateBotGear.generateBotRig] Bot loadout doesn't have any vest available.");
        return [false, false];
    }

    static async generateBotMelee(botInfo, parentId, role) {
        const melee = botInfo.bots[role].weightedGear.melee;

        let scabbard;
        if (melee && melee.length > 0)
            scabbard = getRandomFromArray(melee);
        else
            scabbard = "57e26ea924597715ca604a09";

        const scabbardItem = await this.createWeaponPart(
            scabbard,
            "Scabbard",
            parentId
        );

        return scabbardItem;
    }

    /**
     * Generate weapon preset based on the gear entries for slot,
     * load the magazine, create a list of compatible mags & ammo.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<array>} list of parts making the weapon, list of compatibles magazines, list of compatibles ammo
     */
    static async generateBotWeapon(botInfo, parentId, role, slotId) {
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
                logger.warn(`[generateBotWeapon] Bot loadout doesn't have any ${slotId} weapon available.`);
                break;
        }

        const choice = weightedGear.length === 1
            ? weightedGear[0]
            : getRandomFromArray(weightedGear);

        if (!botInfo.weaponCache.weapons[choice]) {
            logger.error("[generateBotWeapon] botInfo.weaponCache.weapons[choice] is undefined")
        }

        // returns magazine information after assembling weapon
        const [assembledWeapon, ammos, magazines] = await this.assembleWeapon(botInfo, choice, slotId, parentId);
        return [assembledWeapon, ammos, magazines];
    }

    static async sortRequiredParts(required, baseParts) {

    }


    static async assembleWeapon(botInfo, choice, slotId, parentId) {
        const assembledWeapon = []

        const cachedSlots = botInfo.weaponCache.slots;
        const required = await cloneDeep(botInfo.weaponCache.weapons[choice].Required); //generate proper slots by sorting?????
        const baseParts = botInfo.weaponCache.weapons[choice].Parts;

        const [firecontrol, base] = await this.generateFireControl(choice, slotId, parentId);
        const [ammos, ammo, patron_in_weapon] = await this.generateAmmo(base, botInfo.weaponCache.weapons[choice], firecontrol._id);

        assembledWeapon.push(firecontrol, ...patron_in_weapon); //push firecontrol and patron(s) in weapon
        if (required["mod_magazine"]) {
            delete required["mod_magazine"];
        }

        const conflicts = [];
        const stockConflicts = []
        const optional = [];
        for (const slotName in baseParts) {
            if (slotName === "mod_magazine") // magazines need to be handled last
                continue;
            if (Object.keys(required).includes(slotName)) {
                switch (slotName) {
                    case "mod_stock_002":
                    case "mod_stock_axis":
                    case "mod_stock_001":
                    case "mod_stock_akms":
                    case "mod_stock_000":
                    case "mod_stock":

                        const stocks = await this.removeConflictingItems(baseParts[slotName], conflicts);

                        if (typeof stocks === "undefined") {
                            logger.error(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is undefined after filtering, report this`);
                            break;
                        }

                        if (Object.keys(stocks).length === 0) {
                            logger.warn(`[generateRequiredSlot]Weapon: ${firecontrol._tpl} for ${slotName} is empty after filtering, ignore this`);
                            break;
                        }

                        const stock = await this.generateStockSlot(firecontrol._id, slotName, stocks, cachedSlots, required, stockConflicts);

                        if (!stock) {
                            logger.error("Stock undefined");
                        }

                        assembledWeapon.push(...stock);
                        required[slotName] = true;

                        break;

                    case "mod_sight_rear":
                    case "mod_sight_front":

                        const ironsights = await this.removeConflictingItems(baseParts[slotName], conflicts);

                        if (typeof ironsights === "undefined") {
                            logger.error(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is undefined after filtering, report this`);
                            break;
                        }

                        if (Object.keys(ironsights).length === 0) {
                            logger.warn(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is empty after filtering, ignore this`);
                            break;
                        }

                        const ironsight = await this.generateRequiredSlot(firecontrol._id, slotName, ironsights, cachedSlots, required, []);

                        assembledWeapon.push(...ironsight);
                        required[slotName] = true;

                        break;

                    case "mod_pistolgrip":
                    case "mod_pistol_grip_akms":
                    case "mod_pistol_grip":

                        const pistolgrips = await this.removeConflictingItems(baseParts[slotName], conflicts);

                        if (typeof pistolgrips === "undefined") {
                            logger.error(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is undefined after filtering, report this`);
                            break;
                        }

                        if (Object.keys(pistolgrips).length === 0) {
                            logger.warn(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is empty after filtering, ignore this`);
                            break;
                        }

                        const pistolgrip = await this.generateRequiredSlot(firecontrol._id, slotName, pistolgrips, cachedSlots, required, stockConflicts);

                        assembledWeapon.push(...pistolgrip);
                        required[slotName] = true;

                        break;

                    default:
                        // if slotName in required = make it, else push into optional?????

                        const mods = await this.removeConflictingItems(baseParts[slotName], conflicts);

                        if (typeof mods === "undefined") {
                            logger.error(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is undefined after filtering, report this`);
                            break;
                        }

                        if (Object.keys(mods).length === 0) {
                            logger.warn(`[generateRequiredSlot] Weapon: ${firecontrol._tpl} for ${slotName} is empty after filtering, ignore this`);
                            break;
                        }

                        const mod = await this.generateRequiredSlot(firecontrol._id, slotName, mods, cachedSlots, required, conflicts);

                        assembledWeapon.push(...mod);
                        required[slotName] = true;

                        break;
                }
            } else {
                if ((assembledWeapon.filter(part => ["606eef756d0bd7580617baf8", "606eef46232e5a31c233d500"].includes(part._tpl))).length !== 0) { // edgecase for ultima parts

                    const mod_mount = await this.createWeaponPart("60785ce5132d4d12c81fd918", "mod_mount", firecontrol._id); //ultima top rail
                    assembledWeapon.push(mod_mount);

                    for (const part of ["mod_sight_front", "mod_sight_rear"]) {
                        const parts = baseParts[slotName]["60785ce5132d4d12c81fd918"].Slots[part];
                        const mod = await this.generateRequiredSlot(mod_mount._id, part, parts, cachedSlots, required, conflicts);
                        assembledWeapon.push(...mod);
                    }

                }
                continue;
                // let's first get a proper default weapon built
                await this.generateRequiredSlot(firecontrol._id, slotName, baseParts[slotName], optional, required, conflicts);
                break;
            }
        }

        let magazines = false;
        if (baseParts.mod_magazine) {

            baseParts.mod_magazine = await this.removeConflictingItems(baseParts.mod_magazine, conflicts);
            baseParts.mod_magazine = await this.removeConflictingItems(baseParts.mod_magazine, stockConflicts);

            const [mod_magazine, magazine, choices] = await this.generateModMagazine(base._props.ReloadMode, firecontrol._id, baseParts.mod_magazine, ammo);
            magazines = choices;

            assembledWeapon.push(...mod_magazine);
            if (cachedSlots["mod_magazine"][magazine] && cachedSlots["mod_magazine"][magazine].hasOwnProperty("ConflictingItems")) {
                conflicts.push(cachedSlots["mod_magazine"][magazine].ConflictingItems);
            }
            delete required["mod_magazine"];
        }

        return [assembledWeapon, ammos, magazines];
    }

    static async generateStockSlot(parentId, slot, choices, cachedSlots, required, conflicts) {
        const output = []

        const selections = Object.keys(choices);
        if (!selections) {
            logger.error(`[generateStockSlot] selections for ${slot} is undefined`)
        }

        const selection = await this.selectWeaponPart(selections);
        /*         if (selection === "5d0236dad7ad1a0940739d29") {
                    console.log("WE GOT EM, TRAIL EM");
                } */
        if (!selection) {
            logger.error(`[generateStockSlot] selection for ${slot} is undefined`);
            return output;
        }
        const cachedSlotData = await this.decipherSlotNameAndReturnCachedSlot(cachedSlots, slot);

        const part = await this.createWeaponPart(selection, slot, parentId);
        if (cachedSlotData[selection]) { //check cache for ConflictingItems and add them to conflicts if it exists
            if (cachedSlotData[selection].hasOwnProperty("ConflictingItems")) {
                conflicts.push(...cachedSlotData[selection].ConflictingItems);
            }
        }

        if (choices[selection].hasOwnProperty("Slots")) { //check for children/sub slots and apply them if they're required
            const subSlots = choices[selection].Slots;
            for (const subSlot in subSlots) {
                if (await BotUtilities.isBufferTubeAdapterOrChassis(selection) && subSlot === "mod_stock") { // if it's a goddang buffertube we smovin
                    const mod = await this.generateStockSlot(part._id, subSlot, subSlots[subSlot], cachedSlots, required, conflicts);

                    if (!mod) {
                        logger.error(`[generateStockSlot] Buffer Tube ${part._tpl} of ${subSlot} is undefined, report`);
                    }
                    output.push(...mod);
                }

                if (["mod_pistolgrip", "mod_pistol_grip_akms", "mod_pistol_grip"].includes(subSlot)) {

                    if (!required[subSlot] || required[subSlot] === false) {
                        const mod = await this.generateRequiredSlot(part._id, subSlot, subSlots[subSlot], cachedSlots, required, conflicts);

                        if (!mod) {
                            logger.error(`[generateStockSlot] Pistol Grip ${part._tpl} of ${subSlot} for Stock is undefined, report`);
                        }
                        output.push(...mod);
                    }
                }

                if (Object.keys(required).includes(subSlot)) { // if it has a required slot then we smovin
                    const mod = await this.generateRequiredSlot(part._id, subSlot, subSlots[subSlot], cachedSlots, required, conflicts);

                    if (!mod) {
                        logger.error(`[generateStockSlot] Stock ${part._tpl} of ${subSlot} is undefined, report`);
                    }

                    required[subSlot] = true;
                    output.push(...mod);
                } // else maybe generate optional attachments yeehaa
            }
        }

        if (!part || part.length === 0) {
            logger.error("part undefined")
        }

        output.push(part);
        return output;
    }

    static async generateFireControl(choice, slotId, parentId) {
        const base = await Item.get(choice);

        if (base._props.weaponUseType === "primary" && slotId == "Holster") {
            logger.info(`Remove ${base._id} from weightedGear.primaryWeapon`);
        } else if (base._props.weaponUseType !== "secondary" && slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]) {
            logger.info(`Remove ${base._id} from weightedGear.Holster`);
        }

        const firecontrol = await this.createWeaponPart(base, slotId, parentId);
        return [firecontrol, base];
    }

    static async generateAmmo(base, cachedWeapon, parentId) {
        const ammos = await this.getAmmos(base, cachedWeapon);
        const ammo = await this.selectWeaponPart(ammos);
        const patron_in_weapon = await this.checkForChambers(base, parentId, ammo);

        return [ammos, ammo, patron_in_weapon];
    }

    static async generateRequiredSlot(parentId, slot, choices, cachedSlots, required, conflicts) {
        const output = []

        const selections = Object.keys(choices);
        const selection = await this.selectWeaponPart(selections);
        const cachedSlotData = await this.decipherSlotNameAndReturnCachedSlot(cachedSlots, slot);

        const part = await this.createWeaponPart(selection, slot, parentId);
        if (required.hasOwnProperty(slot) && required[slot] === false) { //check off required part
            required[slot] = true;
        }

        if (cachedSlotData[selection]) { //check cache for ConflictingItems and add them to conflicts if it exists
            if (cachedSlotData[selection].hasOwnProperty("ConflictingItems")) {
                conflicts.push(...cachedSlotData[selection].ConflictingItems);
            }
        }

        if (choices[selection].hasOwnProperty("Slots")) { //check for children/sub slots and apply them if they're required
            const subSlots = choices[selection].Slots;
            for (const subSlot in subSlots) {
                if (Object.keys(required).includes(subSlot)) {
                    const mod = await this.generateRequiredSlot(part._id, subSlot, subSlots[subSlot], cachedSlots, required, conflicts);

                    if (!mod) {
                        logger.error(`[generateStockSlot] Parent ${part._tpl} for ${subSlot} is undefined, report`);
                    }

                    output.push(...mod);
                } // else maybe generate optional attachments yeehaa
            }
        } else if (["619b69037b9de8162902673e"].includes(selection)) {
            //this is the hera arms pistol grip & stock
            if (required["mod_stock"])
                delete required["mod_stock"];
            else if (required["mod_stock_akms"])
                delete required["mod_stock_akms"];
        }


        if (!part || part.length === 0) {
            logger.error("part undefined")
        }

        output.push(part);
        return output;
    }

    static async decipherSlotNameAndReturnCachedSlot(slots, slot) {
        switch (slot) {
            case "camora_000":
            case "camora_001":
            case "camora_002":
            case "camora_003":
            case "camora_004":
            case "camora_005":
                return slots["mod_camora"];
            case "mod_mount_006":
            case "mod_mount_005":
            case "mod_mount_004":
            case "mod_mount_003":
            case "mod_mount_002":
            case "mod_mount":
            case "mod_mount_001":
            case "mod_mount_000":
                return slots["mod_mount"];
            case "mod_stock_002":
            case "mod_stock_axis":
            case "mod_stock_001":
            case "mod_stock_akms":
            case "mod_stock_000":
            case "mod_stock":
                return slots["mod_stock"];
            case "mod_tactical_004":
            case "mod_tactical_2":
            case "mod_tactical002":
            case "mod_tactical001":
            case "mod_tactical_003":
            case "mod_tactical_000":
            case "mod_tactical_002":
            case "mod_tactical_001":
            case "mod_tactical":
                return slots["mod_tactical"];
            case "mod_pistolgrip":
            case "mod_pistol_grip_akms":
            case "mod_pistol_grip":
                return slots["mod_pistol_grip"];
            case "mod_muzzle_001":
            case "mod_muzzle_000":
            case "mod_muzzle":
                return slots["mod_muzzle"];
            case "mod_scope_003":
            case "mod_scope_002":
            case "mod_scope_001":
            case "mod_scope_000":
            case "mod_scope":
                return slots["mod_scope"];
            default:
                return slots[slot];
        }
    }

    static async checkForChambers(weapon, firecontrol, ammo) {
        if (weapon._props.Chambers.length > 0) {
            const chambers = await weapon.generateChambersList();
            return this.generatePatronInWeapon(chambers, firecontrol, ammo);
        };
        return [];
    }

    static async getAmmos(weapon, cachedWeapon) {
        const ammos = [];
        if (!cachedWeapon?.Ammo) {
            const read = await readParsed("./assets/database/bot/weaponCache.json");

            ammos.push(...await weapon.generateCompatibleAmmoList());
            cachedWeapon.Ammo = ammos;
            if (!read.weapons[weapon._id].hasOwnProperty("Ammo")) {
                read.weapons[weapon._id].Ammo = [];
                if (cachedWeapon.Ammo) {
                    read.weapons[weapon._id].Ammo.push(...cachedWeapon.Ammo);

                    await writeFile("./assets/database/bot/weaponCache.json", stringify(read));
                }
            }
        } else {
            ammos.push(...cachedWeapon.Ammo);
        }
        return ammos;
    }

    static async generateModMagazine(ReloadMode, parentId, magazines, ammo) {
        const output = [];
        if (ReloadMode !== "OnlyBarrel") {

            let choices = Object.keys(magazines);
            const selection = await this.selectWeaponPart(choices);

            if (!selection) {
                logger.error("[generateModMagazine] const selection is undefined");
            }

            // add magazine to weapon, and fill with ammo
            const data = await Item.get(selection);
            const mod_magazine = await this.createWeaponPart(
                data, "mod_magazine", parentId);

            if (data._props.ReloadMagType === "InternalMagazine") {
                const camoras = magazines[selection]?.Slots ? Object.keys(magazines[selection].Slots) : false;
                if (camoras && camoras.length !== 0) {
                    output.push(mod_magazine);
                    for (const camora of camoras) {

                        const cartridges = await this.createWeaponPart(
                            ammo,
                            camora,
                            mod_magazine._id
                        );

                        cartridges.upd.StackObjectsCount = 1;
                        output.push(cartridges);
                    }
                    return [output, selection, false];
                } else {
                    const cartridges = await this.createWeaponPart(
                        ammo,
                        "cartridges",
                        mod_magazine._id);

                    cartridges.upd.StackObjectsCount = data._props.Cartridges[0]._max_count;
                    output.push(cartridges);
                }
                output.push(mod_magazine);
                return [output, selection, false];
            } else {
                const cartridges = await this.createWeaponPart(
                    ammo,
                    "cartridges",
                    mod_magazine._id
                );

                // remove internal magazines from `choices` so that they don't spawn as spare mags
                const internal = await BotUtilities.removeInternalMagazines();
                choices = Object.keys(await this.removeConflictingItems(magazines, internal));

                cartridges.upd.StackObjectsCount = data._props.Cartridges[0]._max_count;
                output.push(mod_magazine, cartridges);
                return [output, selection, choices];
            }
        }
    }

    /**
     * Generate inventory item for bot inventory: i.e: weapon, backpack, pockets, etc
     * @param {string} item
     * @param {string} slotId
     * @param {string} parentId
     * @param {[]} conflictIds
     * @returns {<Promise> {}}
     */
    static async createWeaponPart(itemId, slotId, parentId) {

        const item = itemId?._props
            ? itemId
            : await Item.get(itemId);

        if (!item) {
            logger.error("[createWeaponPart] const item is undefined")
        }
        const part = await item.createAsNewItemWithParent(parentId);
        part.slotId = slotId;
        const upd = await item.createFreshBaseItemUpd();

        if (upd !== "error") {
            part.upd = upd;
        };

        return part;
    }

    static async removeConflictingItems(selections, conflicts = null) {
        const output = {};
        if (conflicts) {
            for (const selection in selections) {
                if (conflicts.includes(selection))
                    continue;
                output[selection] = selections[selection];
            }

            if (Object.keys(output).length === 0) {
                return false;
            }
            return output;
        }
        return false;
    }

    /**
     * Generates weighted list to have randomly chosen from, returns itemId
     * @param {[]} filter List of itemIds to choose from
     * @returns {<Promise> string}
     */
    static async selectWeaponPart(selection) {

        if (selection.length === 1)
            return selection;

        const entries = await Item.createWeightedList(selection);
        const choice = getRandomFromArray(entries);

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
                logger.info("[generatePatronInWeapon] const patronTemplate is undefined")

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
                if (getPercentRandomBool(randomAmmos.chance)) {
                    const amount = getRandomInt(1, 35);
                    if (ammoSelection[choice]) {
                        ammoSelection[choice] += amount;
                        continue;
                    }
                    ammoSelection[choice] = amount;

                } else {
                    if (Object.keys(ammoSelection).length > 0)
                        ammoSelection[getRandomFromObject(Object.keys(ammoSelection))] += getRandomInt(1, 35);
                    lastchoice = choice;
                }

            } if (Object.keys(ammoSelection).length === 0) { //incase the bot has shit rolls lol
                ammoSelection[lastchoice] = getRandomInt(35, 55);
            }

            if (magazines) {
                const magazineSelection = {};
                for (let i = 0; i < getRandomInt(1, 3); i++) {

                    const [mid, ammo] = [
                        getRandomFromArray(magazines),
                        getRandomFromArray(Object.keys(ammoSelection))
                    ];


                    magazineSelection[mid] = {}
                    if (randomAmmos.magazineEnabled) {
                        const ammosplit = getRandomSplitInt(magazines[mid].count);
                        for (const split of ammosplit) {
                            if (magazineSelection[mid][ammo]) {
                                magazineSelection[mid][ammo] += split;
                                continue;
                            }
                            magazineSelection[mid][ammo] = split;
                        }
                    } else {
                        const magazine = await Item.get(mid);
                        const count = magazine._props.Cartridges[0]._max_count;
                        magazineSelection[mid][ammo] = count;
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
            ? getRandomFromArray(authorizedGear.pocket)
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
        if (backpacks && backpacks.length > 0 && getRandomInt() >= backpackChance) {
            const backpack = getRandomFromArray(backpacks)
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
    static async isBufferTubeAdapterOrChassis(itemId) {
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
            "5ab372a310e891001717f0d8", // M14 TROY S.A.S.S. Chassis stock
            "5addc7005acfc4001669f275", // M14 SAGE International M14ALCS chassis
            "5cdeac22d7f00c000f26168f", // M700 Magpul Pro 700 chassis
            "623b2e9d11c3296b440d1638", // SV-98 CNC Guns OV-SV98 chassis
        ].includes(itemId);
    }

    static async removeInternalMagazines() {
        return [
            '627bce33f21bc425b06ab967',
            '60dc519adf4c47305f6d410d',
            '624c3074dbbd335e8e6becf3',
            '619f54a1d25cbd424731fb99',
            '61a4cda622af7f4f6a3ce617',
            '633ec6ee025b096d320a3b15',
            '5882163824597757561aa922',
            '55d484b44bdc2d1d4e8b456d',
            '6259bdcabd28e4721447a2aa',
            '55d485804bdc2d8c2f8b456b',
            '5882163224597757561aa920',
            '5882163e24597758206fee8c',
            '5f647d9f8499b57dc40ddb93',
            '56deee15d2720bee328b4567',
            '56deeefcd2720bc8328b4568',
            '6076c87f232e5a31c233d50e',
            '5e87080c81c4ed43e83cefda',
            '625ff2ccb8c587128c1a01dd',
            '5a7882dcc5856700177af662',
            '625ff2eb9f5537057932257d',
            '5ae0973a5acfc4001562206c',
            '587df3a12459772c28142567',
            '5a78832ec5856700155a6ca3',
            '5a78830bc5856700137e4c90',
            '625ff3046d721f05d93bf2ee',
            '625ff31daaaa8c1130599f64'
        ]
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;
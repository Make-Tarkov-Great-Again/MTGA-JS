const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { ItemNode } = require("./ItemNode");
const {
    generateMongoID,
    logger,
    getRandomInt,
    getRandomFromArray,
    getRandomFromObject,
    getPercentRandomBool,
    round,
    shuffleArray,
    floor,
    writeFile,
    stringify,
    getRandomSplitInt
} = require("../../utilities");
const { database } = require("../../app");
const cloneDeep = require("rfdc")();

class Bot extends BaseModel {
    constructor() {
        super();
        this.template = cloneDeep(database.core.botTemplate);
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
        const {
            database: {
                core: { gameplay: { bots: { preload: {
                    maxScavPreload, maxFollowerPreload, maxBossPreload, limiter } } } },
                bot: { bots }
            }
        } = require('../../app');

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
                output[bot][difficulty].push(...await this.generateBots(null, null,
                    [{
                        Role: bot,
                        Limit: max,
                        Difficulty: difficulty
                    }]
                ));
            }
        }
        logger.success(`${count} Bots preloaded!`)
        return output;
    }

    static async regeneratePreloadedBots() {
        const {
            database: {
                bot: { preload },
                core: { gameplay: { bots: { preload: {
                    minBossPreload, maxBossPreload,
                    maxFollowerPreload, minFollowerPreload,
                    minScavPreload, maxScavPreload,
                    limiter } } } } } } = require('../../app');

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
                        await this.generateBots(null, null,
                            { Role: bot, Limit: sum, Difficulty: difficulty })
                    );
                    logger.info(`Regenerated ${sum} ${difficulty} ${bot} bots to cache`)
                }
            }
        }
    }

    static async usePreloadedBots(request, reply) {
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
                    ...await this.generateBots(null, null,
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
    static async generateBots(request = null, reply = null, preload = null) {
        const botsParameters = request ? request.body.conditions : preload;
        //logger.info(botsParameters);

        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const { Role, Limit, Difficulty } = botParameter;
            if (!database.bot.bots[Role].gearEntries) {
                database.bot.bots[Role].gearEntries = {};
                for (const gearCateg of database.bot.bots[Role].weightedGear) {
                    const categorie = Object.keys(gearCateg)[0];
                    database.bot.bots[Role].gearEntries[categorie] = await BotUtilities.generateGearEntries(gearCateg[categorie]);
                }
            }

            for (let i = 0; i < Limit; i++) {
                const newBot = new Bot();

                await newBot.setIds(await generateMongoID());
                await newBot.generateInfo(Role, Difficulty);
                await newBot.generateCustomization(Role);
                await newBot.generateHealth(Role, Difficulty);
                await newBot.generateInventory(Role);
                generatedBots.push(newBot.template);
            }
        }
        return generatedBots;
    }

    async generateInfo(role, difficulty) {
        const templateInfo = this.template.Info;

        //if (role === "pmcBot") logger.debug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

        templateInfo.Nickname = await this.generateNickname(role);
        templateInfo.Side = "Savage";
        templateInfo.Voice = await this.generateVoice(role);
        templateInfo.Settings = await this.generateSettings(templateInfo.Settings, role, difficulty);

        await this.setInfo(templateInfo);
    }

    async generateNickname(role) {
        switch (true) {
            case ["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
                "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"].includes(role):
                return getRandomFromArray(database.bot.names.generalFollower);

            case ["marksman", "cursedAssault", "playerscav", "assault"].includes(role):
                return getRandomFromArray(database.bot.names.scav);

            case ["followerSanitar", "followerKojaniy", "followerBully"].includes(role):
                return getRandomFromArray(database.bot.names[role]);

            case ["usec", "bear"].includes(role):
                return getRandomFromArray(database.bot.names.normal);

            default:
                return database.bot.names[role]
                    ? database.bot.names[role][0]
                    : getRandomFromArray(database.bot.names.scav);
        }
    }

    async generateVoice(role) {
        switch (true) {
            case role && database.bot.appearance[role]:
                return typeof database.bot.appearance[role].Voice !== "string"
                    ? getRandomFromObject(database.bot.appearance[role].Voice)
                    : database.bot.appearance[role].Voice;

            case role && ["assault", "cursedAssault", "marksman"].includes(role):
                return getRandomFromObject(database.bot.appearance.scav.Voice);
            case role && ["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role):
                return getRandomFromObject(database.bot.appearance.followerGluhar.Voice);
            default:
                //logger.error(`[Bot : generateInfo] Role [${role}] appearance not handled`);
                return getRandomFromObject(database.bot.appearance.random.Voice);
        }
    }

    async generateSettings(settings, role, difficulty) {
        settings.Role = role;
        settings.BotDifficulty = difficulty;

        switch (true) {
            case ["assault", "cursedAssault", "marksman"].includes(role):
                [settings.StandingForKill, settings.AggressorBonus] = [-0.02, 0.01];
                break;

            case ["bossBully", "bossSanitar", "bossKilla",
                "bossGluhar", "bossKojaniy", "bossTagilla", "followerKilla"].includes(role):
                [settings.StandingForKill, settings.AggressorBonus] = [-0.2, 0.05];
                break;

            case ["followerBirdEye", "followerBigPipe", "exUsec", "bossKnight",
                "sectantWarrior", "sectantPriest", "followerTest",
                "followerTagilla", "pmcBot", "followerGluharSnipe"].includes(role):
                [settings.StandingForKill, settings.AggressorBonus] = [0, 0];
                break;

            case ["usec", "bear"].includes(role):
                [settings.StandingForKill, settings.AggressorBonus] = [0.01, 0.02];
                break;

            case ["gifter"].includes(role):
                [settings.StandingForKill, settings.AggressorBonus] = [-0.3, 0.15];
                break;

            default:
                //logger.info(`[Bot : generateSettings] Role [${role}] settings not handled`);
                [settings.StandingForKill, settings.AggressorBonus] = [0, 0];
                break;
        }

        settings.Experience = await this.generateExperience(role);
        return settings;
    }

    async generateExperience(role) {
        switch (true) {
            case ["sectantPriest", "bossKilla"].includes(role):
                return 1200;
            case ["bossKojaniy"].includes(role):
                return 1100;
            case ["followerBirdEye", "followerBigPipe", "followerTagilla", "bossTagilla",
                "bossSanitar", "bossKnight", "bossGluhar", "bossBully"].includes(role):
                return 1000;
            case ["usec", "bear"].includes(role):
                return getRandomInt(250, 1000);
            case ["followerSanitar", "followerKojaniy", "sectantWarrior"].includes(role):
                return 600;
            case ["followerGluharSecurity", "followerGluharAssault"].includes(role):
                return 500;
            case ["followerGluharScout", "followerBully", "bossTest"].includes(role):
                return 300;
            case ["exUsec"].includes(role):
                return 225;
            case ["assault", "cursedAssault", "marksman", "gifter"].includes(role):
                return -1
            default:
                //logger.info(`[Bot : generateExperience] Role [${role}] settings not handled`);
                return 0;
        }
    }

    async generateCustomization(role) {
        const templateCustomization = this.template.Customization;
        switch (true) {
            case database.bot.appearance[role]:
                templateCustomization.Head = typeof database.bot.appearance[role].Head !== "string"
                    ? await getRandomFromArray(database.bot.appearance[role].Head)
                    : database.bot.appearance[role].Head;

                templateCustomization.Body = typeof database.bot.appearance[role].Body !== "string"
                    ? await getRandomFromArray(database.bot.appearance[role].Body)
                    : database.bot.appearance[role].Body;

                templateCustomization.Hands = typeof database.bot.appearance[role].Hands !== "string"
                    ? await getRandomFromArray(database.bot.appearance[role].Hands)
                    : database.bot.appearance[role].Hands;

                templateCustomization.Feet = typeof database.bot.appearance[role].Feet !== "string"
                    ? await getRandomFromArray(database.bot.appearance[role].Feet)
                    : database.bot.appearance[role].Feet;

                break;

            case ["assault", "cursedAssault", "marksman"].includes(role):
                templateCustomization.Head = await getRandomFromArray(database.bot.appearance.scav.Head);
                templateCustomization.Body = await getRandomFromArray(database.bot.appearance.scav.Body);
                templateCustomization.Hands = await getRandomFromArray(database.bot.appearance.scav.Hands);
                templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.scav.Feet);

                break;

            case ["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role):
                templateCustomization.Head = await getRandomFromArray(database.bot.appearance.followerGluhar.Head);
                templateCustomization.Body = await getRandomFromArray(database.bot.appearance.followerGluhar.Body);
                templateCustomization.Hands = database.bot.appearance.followerGluhar.Hands;
                templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.followerGluhar.Feet);

                break;

            default:
                //logger.error(`Role [${role}] customization not handled, randomizing`);
                templateCustomization.Head = await getRandomFromArray(database.bot.appearance.random.Head);
                templateCustomization.Body = await getRandomFromArray(database.bot.appearance.random.Body);
                templateCustomization.Hands = await getRandomFromArray(database.bot.appearance.random.Hands);
                templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.random.Feet);

                break;
        }
        await this.setCustomization(templateCustomization);
    }

    async generateHealth(role, difficulty) {
        const health = this.template.Health;
        switch (true) {
            case database.bot.bots[role].health && Object.keys(database.bot.bots[role].health).length > 1:
                Object.assign(health, database.bot.bots[role].health[difficulty]);
                break;
            case database.bot.bots[role].health:
                Object.assign(health, database.bot.bots[role].health);
                break;
            default:
                //logger.error(`[Bot : generateHealth] Role [${role}] health not handled`);
                Object.assign(health, database.bot.bots["assault"].health["impossible"]);
                break;
        }
        return this.setHealth(health);
    }

    async generateInventory(role) {
        const templateInventory = this.template.Inventory;
        const templateItems = templateInventory.items;

        templateInventory.equipment = await generateMongoID();
        templateInventory.stash = await generateMongoID();
        templateInventory.sortingTable = await generateMongoID();
        templateInventory.questRaidItems = await generateMongoID();
        templateInventory.questStashItems = await generateMongoID();


        templateItems[0]._id = templateInventory.equipment;
        templateItems[1]._id = templateInventory.stash;
        templateItems[2]._id = templateInventory.sortingTable;
        templateItems[3]._id = templateInventory.questRaidItems;
        templateItems[4]._id = templateInventory.questStashItems;

        const botDefaultInventory = await this.generateInventoryItems(
            templateInventory.equipment, role);
        templateItems.push(...botDefaultInventory);

        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(parentId, role) {
        const botSettings = database.core.gameplay.bot;
        const output = [];

        const botPocket = await BotItemGeneration.generateBotPockets(parentId, role);
        output.push(botPocket);
        // TODO: generate loot in pockets ? Loose bullets ? Money ? Bandages ? Grenades ?

        const securedContainer = await BotItemGeneration.generateSecuredContainer(parentId);
        output.push(securedContainer);

        const [botVest, armored] = await BotItemGeneration.generateBotVest(parentId, role);
        if (botVest)
            output.push(botVest);

        // TODO: generate more loot in the botRig ? meds, valuable...

        if (!armored) {
            const bodyArmor = await BotItemGeneration.generateBotBodyArmor(parentId, role);
            if (bodyArmor)
                output.push(bodyArmor);
        }

        const [weapon, ammos, magazines] = await BotItemGeneration.generateBotWeapon(parentId, role, "FirstPrimaryWeapon");
        output.push(...weapon);

        const ammo = Object.keys(magazines).length > 0
            ? await BotItemGeneration.generateAmmoInContainer(botVest, securedContainer, ammos, magazines)
            : await BotItemGeneration.generateAmmoInContainer(botPocket, securedContainer, ammos);

        output.push(...ammo);

        const botBackpack = await BotItemGeneration.generateBotBackpack(parentId, role, botSettings.backpackChance);
        if (botBackpack)
            output.push(botBackpack);

        // TODO: generate loot in backpack: valuable, hideout items, barter stuff...

        const [helmet, headwearConflicts] = await BotItemGeneration.generateBotHeadwear(parentId, role, botSettings.headwearChance);
        if (helmet)
            output.push(helmet);

        const [facecover, facecoverConflicts] = await BotItemGeneration.generateBotFacecover(parentId, role, headwearConflicts, botSettings.facecoverChance);
        if (facecover)
            output.push(facecover);

        const earpiece = await BotItemGeneration.generateBotEarpiece(parentId, role, [...headwearConflicts, ...facecoverConflicts], botSettings.earpieceChance);
        if (earpiece)
            output.push(earpiece);

        const scabbard = await BotItemGeneration.generateBotMelee(parentId, role);
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
    static async generateBotEarpiece(parentId, role, conflictIds, earpieceChance) {
        const gearEntries = await BotUtilities.cleanPartList(database.bot.bots[role].gearEntries.earpiece, conflictIds)
        if (gearEntries && gearEntries.length > 0 && await getRandomInt() <= earpieceChance) {
            const choices = await shuffleArray(gearEntries)
            const earpieceTemplate = await Item.get(await getRandomFromArray(choices));

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
    static async generateBotFacecover(parentId, role, conflictIds, facecoverChance) {
        const facecovers = await BotUtilities.cleanPartList(database.bot.bots[role].gearEntries.facecover, conflictIds);
        if (facecovers && facecovers.length > 0 && await getRandomInt() <= facecoverChance) {
            const choices = await shuffleArray(facecovers)
            const facecoverTemplate = await Item.get(await getRandomFromArray(choices));
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
    static async generateBotHeadwear(parentId, role, headwearChance) {
        const headwears = database.bot.bots[role].gearEntries.headwear;
        if (headwears && headwears.length > 0 && await getRandomInt() <= headwearChance) {
            const headwearTemplate = await Item.get(await getRandomFromArray(await shuffleArray(headwears)));

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
    static async generateBotBodyArmor(parentId, role) {
        const gearEntries = database.bot.bots[role].gearEntries.bodyArmor;
        if (gearEntries && gearEntries.length > 0) {
            const armorTemplate = await Item.get(await getRandomFromArray(gearEntries));
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
    static async generateBotVest(parentId, role) {
        const gearEntries = database.bot.bots[role].gearEntries.vest;
        // pick the itemID to generate
        if (gearEntries && gearEntries.length > 0) {
            const choices = await shuffleArray(gearEntries);
            const vestTemplate = await Item.get(await getRandomFromArray(choices));
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

    static async generateBotMelee(parentId, role) {
        const gearEntries = database.bot.bots[role].gearEntries.melee;
        const scabbard = gearEntries && gearEntries.length > 0 ?
            await getRandomFromArray(await shuffleArray(database.bot.bots[role].gearEntries.melee)) :
            "57e26ea924597715ca604a09";

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
    static async generateBotWeapon(parentId, role, slotId, ammos = [], magazines = {}) {
        const gearEntries = [
            //"55801eed4bdc2d89578b4588", // SV-98 7.62x54R bolt-action sniper rifle
            "5ae08f0a5acfc408fb1398a1", // Mosin 7.62x54R bolt-action rifle (Sniper)

        ]
        //database.bot.bots[role].gearEntries.primaryWeapon;
        /*         if (slotId === "Holster")
                    gearEntries = gearEntries.holster;
                else if (slotId === "FirstPrimaryWeapon")
                    gearEntries = gearEntries.primaryWeapon;
                else
                    gearEntries = gearEntries.secondaryWeapon; */

        /*         if (!gearEntries || gearEntries.length === 0) {
                    logger.warn(`[BotItemGeneration.generateBotGear.generateBotWeapon] Bot loadout doesn't have any ${slotId} weapon available.`);
                    return [false, false, false];
                } */

        /**
         *
         * // Primary Weapons To Test:
         * "6165ac306ef05c2ce828ef74" // SCAR // test stocks
         * 
         *
         * 
         * // Primary Weapons Tested:
         * "583990e32459771419544dd2", // Kalashnikov AKS-74UN 5.45x39 assault rifle
         * "5644bd2b4bdc2d3b4c8b4572", // Kalashnikov AK-74N 5.45x39 assault rifle
         * "5abcbc27d8ce8700182eceeb", // Kalashnikov AKMSN 7.62x39 assault rifle
         * "5beed0f50db834001c062b12", // RPK-16 5.45x39 light machine gun
         * "606587252535c57a13424cfd", // Mk47 Mutant // mod_stock_001
         * "5ea03f7400685063ec28bfa8", // PPSh-41 7.62x25 submachine gun
         * "57c44b372459772d2b39b8ce", // AS VAL 9x39 special assault rifle
         * "61f7c9e189e6fb1a5e3ea78d", // MP-18 7.62x54R single-shot rifle
         * "6259b864ebedf17603599e88", // Benelli M3 Super 90 dual-mode 12ga shotgun
         * "60db29ce99594040e04c4a27", // MTs-255-12 12ga shotgun
         * "57f4c844245977379d5c14d1", // PP-9 "Klin" 9x18PMM submachine gun
         * "6165ac306ef05c2ce828ef74", // SCAR // test stocks
         * "56dee2bdd2720bc8328b4567" // MP-153 12ga semi-automatic shotgun
         * "5e848cc2988a8701445df1e8", // TOZ KS-23M 23x75mm pump-action shotgun
         * "60339954d62c9b14ed777c06", // Soyuz-TM STM-9 Gen.2 9x19 carbine
         * "5cc82d76e24e8d00134b4b83", // FN P90 5.7x28 submachine gun (sight is a mount)
         * "623063e994fc3f7b302a9696", // HK G36 5.56x45 assault rifle
         * "5cadfbf7ae92152ac412eeef", // ASh-12 12.7x55 assault rifle
         *
         * Modifications To Test:
         */

        const assembledWeapon = [];
        const choice = gearEntries.length === 1 ? gearEntries[0] : await this.selectWeaponPart(gearEntries);

        let weapon = await Item.get(choice);
        if (!weapon._props) {
            logger.info(`Remove ${choice} from gearEntries.primaryWeapon`);
            weapon = await Item.get("583990e32459771419544dd2");
        }

        const firecontrol = await this.createWeaponPart(weapon, slotId, parentId);
        assembledWeapon.push(firecontrol); //push base of weapon

        const { required, optional } = await BotUtilities.generatePartList(weapon);

        if (weapon._props.weaponUseType === "primary" && slotId == "Holster") {
            logger.info(`Remove ${weapon._id} from gearEntries.primaryWeapon`);
        } else if (weapon._props.weaponUseType !== "secondary" && slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]) {
            logger.info(`Remove ${weapon._id} from gearEntries.Holster`);
        }

        ammos = await weapon.generateCompatibleAmmoList();
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
            magazines = await weapon.generateCompatibleMagazineList(true);
            const filtered = await BotUtilities.cleanPartList(Object.keys(magazines), conflictIds);
            const selected = await this.selectWeaponPart(filtered)
            const magazine = magazines[selected];
            magazine.ammos = magazine.ammos.filter(item => !item.includes(ammos));

            // add magazine to weapon, and fill with ammo
            const anamoly = await Item.get(magazine.id)
            const mod_magazine = await this.createWeaponPart(
                anamoly, "mod_magazine", firecontrol._id, conflictIds);

            if (weapon._props.ReloadMode === "InternalMagazine") {
                magazines = {}; // doesn't need spare magazines, just ammo
                const camoras = await anamoly.generateCamoraList();
                for (const camora of camoras) {
                    const cartridges = await this.createWeaponPart(
                        ammo, camora, mod_magazine._id);
                    cartridges.upd.StackObjectsCount = 1; // shuffle ammo in magazine here
                    assembledWeapon.push(cartridges);
                }
                assembledWeapon.push(mod_magazine);
            } else {
                const cartridges = await this.createWeaponPart(
                    ammo, "cartridges", mod_magazine._id);
                cartridges.upd.StackObjectsCount = magazine.count; // shuffle ammo in magazine here
                assembledWeapon.push(mod_magazine, cartridges);
            }

            if (anamoly?._props?.ReloadMagType === "InternalMagazine") {
                magazines = {};
            }
        }

        /**
         * Reintroduce load order for required parts
         * 
         * 
         * Upper Receiver
         * Stock
         * Barrel
         * Gasblock
         * Handguard
         * Pistol Grip
         * Charging Handle
         * Front Sight & Rear Sight
         * 
         * 
         * Barrel needs to come before handguard
         */
        const rid = Object.keys(required);
        const loops = Object.keys(required).length;

        for (let i = 0; i < loops; i++) {
            const require = required[rid[i]];

            mod_part = await this.generateRequiredWeaponPart(
                require, firecontrol._id, conflictIds, filledAttachments);
            assembledWeapon.push(...mod_part);

            //delete required[rid[i]];
        }

        if (Object.keys(optional).length === 0) return [assembledWeapon, ammos, magazines];
        if (filledAttachments.includes("mod_scope") && optional["mod_mount"]) {
            delete optional["mod_mount"]
        }

        for (const oid in optional) {
            const option = optional[oid];

            mod_part = await this.generateOptionalWeaponPart(
                option, firecontrol._id, conflictIds, filledAttachments);
            assembledWeapon.push(...mod_part);
        }

        return [assembledWeapon, ammos, magazines];
    }

    static async generateRequiredWeaponPart(required, parentId, conflictIds, filledAttachments) {
        const output = [];

        if (required.filter.length === 0) return output;
        const filtered = await BotUtilities.cleanPartList(required.filter, conflictIds);
        if (filtered.length === 0) return output;

        const part = filtered.length === 1 ? filtered[0] : await this.selectWeaponPart(filtered);
        const mod_part = await this.generateWeaponPart(
            part,
            required.slotId,
            parentId,
            conflictIds,
            filledAttachments,
            await BotUtilities.isBufferTubeOrAdapter(part) // i hate bsg
                ? await BotUtilities.generatePartList(part) // treat stock required
                : await BotUtilities.generatePartList(part, false) // treat stock optional
        );
        output.push(...mod_part);
        return output;
    }

    static async generateOptionalWeaponPart(optional, parentId, conflictIds, filledAttachments) {
        const output = [];

        if (optional.filter.length === 0) return output;
        const filtered = await BotUtilities.cleanPartList(optional.filter, conflictIds);
        if (filtered.length === 0) return output;

        const part = filtered.length === 1 ? filtered[0] : await this.selectWeaponPart(filtered);
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
        const itemTemplate = item?._props ? item : await Item.get(item);
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


    static async generateWeaponPart(partId, slotId, parentId, conflictIds, filledAttachments = null, partList = null) {
        const output = [];

        const partTemplate = partId?._props ? partId : await Item.get(partId);
        const { required, optional } = partList ? partList : await BotUtilities.generatePartList(partTemplate, false);
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
                    if (required[id].filter.length === 0) break; // first break
                    const filtered = await BotUtilities.cleanPartList(required[id].filter, conflictIds);
                    if (filtered.length === 0) break; // second break
                    const part = filtered.length === 1 ? filtered[0] : await this.selectWeaponPart(filtered);

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
                    const part = filtered.length === 1 ? filtered[0] : await this.selectWeaponPart(filtered);

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
                            roll = count > 0
                                ? await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85) - (5 * count)))
                                : await getPercentRandomBool(await getRandomInt(0, await getRandomInt(65, 85)));

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

        const weightedList = await BotUtilities.generateWeightedList(filter);

        const choices = await shuffleArray(await BotUtilities.generateGearEntries(weightedList));

        const choice = await getRandomFromArray(choices);

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
                logger.info("balle")

            const patron = await patronTemplate.createAsNewItemWithParent(parentId);
            patron.slotId = name;
            patron.upd = {
                StackObjectsCount: 1
            };

            output.push(patron);
        }
        return output;
    }

    static async generateAmmoInContainer(mainContainer, secureContainer, ammos, magazines = null) {
        const { database: { core: { gameplay: { bots: { randomAmmos } } } } } = require(`../../app`);
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

            }

            if (Object.keys(ammoSelection).length === 0) { //incase the bot has shit rolls lol
                ammoSelection[lastchoice] = await getRandomInt(35, 55);
            }

            if (magazines) {
                const magazineSelection = {};
                for (let i = 0; i < await getRandomInt(2, 3); i++) {
                    const mid = await getRandomFromArray(Object.keys(magazines));
                    const ammo = await getRandomFromArray(Object.keys(ammoSelection));


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
        } else {
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
        }
    }

    static async addMagazinesToContainer(mainContainer, securedContainer, magazines) {
        const main = [];
        const mainAmmo = [];
        const sc = [];
        const scAmmo = [];

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

    static async createMagazineForContainer(parentId, magazine, freeSlot) {
        const mod_magazine = await this.createWeaponPart(
            magazine,
            freeSlot.slotId,
            parentId
        )
        mod_magazine.location = {
            x: freeSlot.x,
            y: freeSlot.y,
            r: freeSlot.r
        };

        if (Object.keys(mod_magazine.location).length === 0) {
            logger.info("yo wtf");
        }
        return mod_magazine;
    }

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
            r: freeSlot.r
        };
        return mod_ammo;
    }

    /**
     * Generate pockets based on bot loadout.
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @returns {Promise<object>} pocket item
     */
    static async generateBotPockets(parentId, role) {
        const authorizedGear = database.bot.bots[role].authorizedGear;
        const pocket = authorizedGear?.pocket ? await getRandomFromArray(authorizedGear.pocket) : "557ffd194bdc2d28148b457f";

        return await this.createWeaponPart(
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
    static async generateBotBackpack(parentId, role, backpackChance) {
        const gearEntries = database.bot.bots[role].gearEntries.backpack;
        if (gearEntries && gearEntries.length > 0 && await getRandomInt() >= backpackChance) {
            return this.createWeaponPart(
                await Item.get(await getRandomFromArray(gearEntries)),
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

    static async cleanPartList(list, conflictIds) {
        const output = [];
        for (const id of list) {
            if (conflictIds.includes(id)) continue;
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

    static async generateWeightedList(gearList) {
        // retrieve all prices of items in categ
        const itemsWithPrices = [];
        for (const item of gearList) {
            itemsWithPrices.push({ itemId: [item], price: await Item.getItemPrice(item) });
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
        return invertedWeight;
    }

    /**
     * Create list of gears that can be picked
     * @param {array} weightedGearList
     */
    static async generateGearEntries(weightedGearList) {
        const result = [];
        for (const item of weightedGearList) {
            const itemId = Object.keys(item)[0];

            if (item[itemId] < 1) // if it's 0 then it won't choose anything
                item[itemId] = 1; // default to 1

            for (let i = 0; i < item[itemId]; i++) {
                result.push(itemId);
            }
        }
        return result;
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;
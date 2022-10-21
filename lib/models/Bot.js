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
    stringify
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
                core: { gameplay: { bots: { preloadParameters: {
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
                bot: { preload }, core: { gameplay: { bots: {
                    preloadParameters: {
                        minBossPreload,
                        maxBossPreload,
                        maxFollowerPreload,
                        minFollowerPreload,
                        minScavPreload,
                        maxScavPreload,
                        limiter
                    } } } } } } = require('../../app');

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
                        { Role: Role, Limit: (sum), Difficulty: Difficulty })
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

        if (role === "pmcBot") //logger.debug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

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

        const weapon = await BotItemGeneration.generateBotWeapon(parentId, role, "FirstPrimaryWeapon");
        output.push(...weapon);
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
    static async generateBotWeapon(parentId, role, slotId) {
        //const gearEntries = database.bot.bots[role].gearEntries.primaryWeapon;
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
         * "5ea03f7400685063ec28bfa8" // PPSh-41 7.62x25 submachine gun
         * "57f4c844245977379d5c14d1" // PP-9 "Klin" 9x18PMM submachine gun
         * "57c44b372459772d2b39b8ce" // AS VAL 9x39 special assault rifle
         * "6165ac306ef05c2ce828ef74" // SCAR // test stocks
         *
         * 
         * // Primary Weapons Tested:
         * "583990e32459771419544dd2", // Kalashnikov AKS-74UN 5.45x39 assault rifle
         * "5644bd2b4bdc2d3b4c8b4572", // Kalashnikov AK-74N 5.45x39 assault rifle
         * "5abcbc27d8ce8700182eceeb", // Kalashnikov AKMSN 7.62x39 assault rifle
         * "5beed0f50db834001c062b12", // RPK-16 5.45x39 light machine gun
         * "606587252535c57a13424cfd" // Mk47 Mutant // mod_stock_001
         *
         * Modifications To Test:
         */

        const weaponPool = [
            //"583990e32459771419544dd2", // Kalashnikov AKS-74UN 5.45x39 assault rifle
            //"5644bd2b4bdc2d3b4c8b4572", // Kalashnikov AK-74N 5.45x39 assault rifle
            //"5abcbc27d8ce8700182eceeb", // Kalashnikov AKMSN 7.62x39 assault rifle
            "5beed0f50db834001c062b12", // RPK-16 5.45x39 light machine gun
            //"606587252535c57a13424cfd", // Mk47 Mutant // mod_stock_001
            //"5ea03f7400685063ec28bfa8", // PPSh-41 7.62x25 submachine gun,
            //"57c44b372459772d2b39b8ce" // AS VAL 9x39 special assault rifle
        ]

        const assembledWeapon = [];
        const choice = weaponPool.length === 1 ? weaponPool[0] : await getRandomFromArray(weaponPool);
        let weapon = await Item.get(choice);
        if (!weapon._props) {
            logger.info(`Remove ${choice} from gearEntries.primaryWeapon`);
            weapon = await Item.get("583990e32459771419544dd2");
        }


        const firecontrol = await this.createWeaponPart(weapon, slotId, parentId);
        assembledWeapon.push(firecontrol); //push base of weapon

        const requiredSlots = await BotUtilities.generatePartList(weapon);
        let required = Object.keys(requiredSlots.required);

        if (weapon._props.weaponUseType === "primary" && slotId == "Holster") {
            logger.info(`Remove ${weapon._id} from gearEntries.primaryWeapon`);
        } else if (weapon._props.weaponUseType !== "secondary" && slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]) {
            logger.info(`Remove ${weapon._id} from gearEntries.Holster`);
        }

        const ammos = await weapon.generateCompatibleAmmoList();
        const ammo = await this.selectWeaponPart(ammos);
        if (weapon._props.Chambers.length > 0) {
            const chambers = await weapon.generateChambersList();
            const patron_in_weapon = await this.generatePatronInWeapon(chambers, firecontrol._id, ammo);

            assembledWeapon.push(...patron_in_weapon);
        };

        const magazines = await weapon.generateCompatibleMagazineList(true);
        const magazine = magazines[await this.selectWeaponPart(Object.keys(magazines))];
        magazine.ammos = magazine.ammos.filter(item => !item.includes(ammos));

        // add magazine to weapon, and fill with ammo
        const mod_magazine = await this.createWeaponPart(magazine.id, "mod_magazine", firecontrol._id);
        const cartridges = await this.createWeaponPart(ammo, "cartridges", mod_magazine._id);
        cartridges.upd.StackObjectsCount = magazine.count; // shuffle ammo in magazine here
        assembledWeapon.push(mod_magazine, cartridges);


        let conflictIds = [];
        const filledAttachments = [];
        let mod_part;
        for (let i = 0; i < Object.keys(requiredSlots.required).length; i++) {

            switch (true) {
                case required.includes("mod_reciever"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_reciever, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_reciever");
                    break;

                case required.includes("mod_gas_block"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_gas_block, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_gas_block");
                    break;

                case required.includes("mod_muzzle"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_muzzle, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_muzzle");
                    break;

                case required.includes("mod_barrel"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_barrel, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_barrel");
                    break;

                case required.includes("mod_handguard"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_handguard, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_handguard");
                    break;

                case required.includes("mod_charge"):
                    //conflictIds = [];
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_charge, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_charge");
                    break;

                case required.includes("mod_pistol_grip"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_pistol_grip, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_pistol_grip");
                    break;

                case required.includes("mod_stock"):
                    mod_part = await this.generateWeapon(requiredSlots.required.mod_stock, firecontrol._id, conflictIds, filledAttachments);
                    assembledWeapon.push(...mod_part);
                    required = required.filter(part => part !== "mod_stock");
                    break;
            }
        }

        return assembledWeapon;
    }

    static async generateWeapon(required, parentId, conflictIds, filledAttachments) {
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
        if (upd !== "error") inventoryItem.upd = upd;

        if (conflictIds) conflictIds.push(...itemTemplate._props.ConflictingItems);
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


                    let mod_optional;
                    let roll = await getPercentRandomBool(await getRandomInt(5))
                    let count = 0;
                    switch (id) {
                        case "mod_mount":
                            for (const a in [
                                "mod_mount_000",
                                "mod_mount_001",
                                "mod_mount_002",
                                "mod_mount_003",
                                "mod_mount_004",
                                "mod_mount_005"
                            ]) {
                                if (!filledAttachments.includes(a)) continue;
                                count++;
                            }
                            if (count > 0 && roll)
                                roll = await getPercentRandomBool(await getRandomInt(5, 100 - (10 * count)));

                            mod_optional = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            options.push(...mod_optional);
                            break;

                        case "mod_tactical":
                            for (const a in [
                                "mod_tactical_000",
                                "mod_tactical_001",
                                "mod_tactical_002",
                                "mod_tactical_003",
                                "mod_mount_004"
                            ]) {
                                if (!filledAttachments.includes(a)) continue;
                                count++;
                            }
                            if (count > 0 && roll)
                                roll = await getPercentRandomBool(await getRandomInt(5, 100 - (10 * count)));

                            mod_optional = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            options.push(...mod_optional);
                            break;

                        case "mod_sight_rear":
                            const { _props: { Slots } } = await Item.get(part);
                            if ("5beec9450db83400970084fd" !== parent._tpl) {
                                if (Slots[0]?._props.filters[0].Filter.length !== 1 && !roll) break;
                            }
                            mod_optional = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            options.push(...mod_optional);
                            break;

                        case "mod_stock":
                            if (filledAttachments.includes(optional[id].slotId)) break;
                            if (id === slotId && await BotUtilities.isBufferTubeOrAdapter(part)) break;

                            //const mod_mount = await Item.get(part);
                            mod_optional = await this.generateWeaponPart(
                                part,
                                optional[id].slotId,
                                parent._id,
                                conflictIds,
                                filledAttachments
                            );

                            filledAttachments.push(optional[id].slotId); options.push(...mod_optional);

                            break;
                        default:
                            if (!roll || filledAttachments.includes(optional[id].slotId)) break;
                            mod_optional = await this.generateWeaponPart(
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
        filter = filter.filter(item => !BotUtilities.mountsToBlockBecauseTheySuck().includes(item))
        const weightedList = await BotUtilities.generateWeightedList(filter);
        const choices = await shuffleArray(await BotUtilities.generateGearEntries(weightedList));
        return getRandomFromArray(choices);
    }

    /**
     * Generate `round-in-chamber` for weapon
     * @param {[]} patronNames
     * @param {string} parentId
     * @param {string} ammoId
     * @returns {<Promise>[{}]}
     */
    static async generatePatronInWeapon(patronNames, parentId, ammoId) {
        const output = [];
        for (const name of patronNames) {
            const patronTemplate = await Item.get(ammoId);
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
     * Unused at the moment
     */
    static async shuffleAmmo() {
        // ammo shuffle????
        const ammo = [];
        if (await getPercentRandomBool(50)) {
            let remainder = selectedMagazine.count;
            for (let i = 0; i < await getRandomInt(1, 3); i++) {
                const amount = await getRandomInt(1, remainder);
                remainder -= amount < 0 ? 0 : amount;
            }
        }
    }

    /**
     *
     * @param {[]} ammoList
     * @param {*} magazine
     */
    static async generateStacksOfSpareAmmo(ammoList, magazine = null) {
        if (magazine) {
            logger.info("Get magazine capacity")
        }

        // add magazines to rig
        // add magazines to secure container
    }

    /**
     * Generate magazines previously picked in the list of compatible mags lst with ammo from the compatible ammo lst with in vest slots.
     * @param {object} container the container
     * @param {array} compatibleMagazines list of compatible magazines
     * @param {array} compatibleAmmo list of compatible ammos
     * @returns {Promise<array>} list of generated mags with cartridges
     */
    static async generateMagazinesInContainer(container, magPicked, amountToGenerate) {
        const output = [];
        for (let i = 0; i < amountToGenerate; i++) {
            const magSize = await magPicked.getSize();
            const freeSlot = await Item.getFreeSlot(container, output, magSize.width, magSize.height);
            if (!freeSlot)
                break;
            output.push(await BotItemGeneration.generateMagazine(container._id, magPicked, freeSlot));
        }
        return output;
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
     * Generate magazines for parent
     * @param {string} parentId id of the item were the mag will be
     * @param {object} magazine Item model instance of the magazine
     * @param {object} freeSlot location of the slot available
     * @returns {Promise<object>} newly created magazine
     */
    static async generateMagazine(parentId, magazine, freeSlot) {
        const newMag = await magazine.createAsNewItem();
        newMag.parentId = parentId;
        newMag.slotId = freeSlot.slotId;
        newMag.location = {
            x: freeSlot.x,
            y: freeSlot.y,
            r: freeSlot.r
        };
        return newMag;
    }

    /**
     * Generate a Boss secured container
     * @param {string} parentId
     * @returns {Promise<object>} newly created Boss SC
     */
    static async generateSecuredContainer(parentId) {
        return this.createWeaponPart(
            await Item.get("5c0a794586f77461c458f892"),
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
            if (slot._name === "mod_magazine") continue;
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
            for (let i = 0; i < item[itemId]; i++) {
                result.push(itemId);
            }
        }
        return result;
    }

    static async generateAllowedItems(items, slot) {
        const filtered = [];
        const filters = await this.getDefaultInventorySlots();
        for (let item of items) {
            if (!item._id) item = await Item.get(item);
            for (let filter of filters[slot]) {
                if (typeof await ItemNode.get(filter) !== "undefined") {
                    if (item._parent === filter) {
                        for (const f of filters[slot]) {
                            if (item._id !== f && item._parent === filter) {
                                filtered.push(item._id);
                            }
                        }
                    }
                }
                if (item._id === filter) {
                    filtered.push(item._id);
                }
            }
        }
        return filtered
    }

    static async getDefaultInventorySlots() {
        return {
            "FirstPrimaryWeapon": [
                "5447b5fc4bdc2d87278b4567",
                "5447b5f14bdc2d61278b4567",
                "5e81ebcd8e146c7080625e15",
                "5447bed64bdc2d97278b4568",
                "5447b6194bdc2d67278b4567",
                "60db29ce99594040e04c4a27",
                "5447b6094bdc2dc3278b4567",
                "5447b5e04bdc2d62278b4567",
                "5447b6254bdc2dc3278b4568",
                "5447bee84bdc2dc3278b4569",
                "6275303a9f372d6ea97f9ec7"
            ],
            "SecondPrimaryWeapon": [
                "5447b5fc4bdc2d87278b4567",
                "5447b5f14bdc2d61278b4567",
                "5e81ebcd8e146c7080625e15",
                "5447bed64bdc2d97278b4568",
                "5447b6194bdc2d67278b4567",
                "5447b6094bdc2dc3278b4567",
                "5447b5e04bdc2d62278b4567",
                "5447b6254bdc2dc3278b4568",
                "5447bee84bdc2dc3278b4569",
                "60db29ce99594040e04c4a27",
                "6275303a9f372d6ea97f9ec7"
            ],
            "Holster": [
                "620109578d82e67e7911abf2",
                "5447b5cf4bdc2d65278b4567",
                "624c2e8614da335f1e034d8c",
                "61a4c8884f95bc3b2c5dc96f"
            ],
            "Scabbard": [
                "5447e1d04bdc2dff2f8b4567"
            ],
            "FaceCover": [
                "5a341c4686f77469e155819e"
            ],
            "Headwear": [
                "59e770f986f7742cbe3164ef",
                "572b7d8524597762b472f9d1",
                "5aa2b87de5b5b00016327c25",
                "5aa2a7e8e5b5b00016327c16",
                "5a43943586f77416ad2f06e2",
                "5aa2b89be5b5b0001569311f",
                "5aa2b8d7e5b5b00014028f4a",
                "5a43957686f7742a2c2f11b0",
                "5aa2ba46e5b5b000137b758d",
                "5aa2b9ede5b5b000137b758b",
                "5aa2ba19e5b5b00014028f4e",
                "5ab8f20c86f7745cdb629fb2",
                "5645bc214bdc2d363b8b4571",
                "5aa7cfc0e5b5b00015693143",
                "5aa7e276e5b5b000171d0647",
                "5c066ef40db834001966a595",
                "5df8a58286f77412631087ed",
                "59e7711e86f7746cae05fbe1",
                "5d5e7d28a4b936645d161203",
                "5d5e9c74a4b9364855191c40",
                "5a154d5cfcdbcb001a3b00da",
                "5ac8d6885acfc400180ae7b0",
                "5a7c4850e899ef00150be885",
                "5aa7d193e5b5b000171d063f",
                "5aa7d03ae5b5b00016327db5",
                "5a16bb52fcdbcb001a3b00dc",
                "5aa7e454e5b5b0214e506fa2",
                "5aa7e4a4e5b5b000137b76f2",
                "5f99418230835532b445e954",
                "5b4329f05acfc47a86086aa1",
                "5b43271c5acfc432ff4dce65",
                "5b40e5e25acfc4001a599bea",
                "5f60e6403b85f6263c14558c",
                "5f60e7788adaa7100c3adb49",
                "5f60e784f2bcbb675b00dac7",
                "60bf74184a63fc79b60c57f6",
                "5d96141523f0ea1b7f2aacab",
                "5bd073c986f7747f627e796c",
                "61c18db6dfd64163ea78fbb4",
                "603618feffd42c541047f771",
                "603619720ca681766b6a0fc4",
                "6040de02647ad86262233012",
                "60361a7497633951dc245eb4",
                "60361b0b5a45383c122086a1",
                "60361b5a9a15b10d96792291",
                "5b4327aa5acfc400175496e0",
                "618aef6d0a5a59657e5f55ee",
                "60b52e5bc7d8103275739d67",
                "5b4329075acfc400153b78ff",
                "5f994730c91ed922dd355de3",
                "60a7acf20c5cb24b01346648",
                "5b40e61f5acfc4001a599bec",
                "5b40e3f35acfc40016388218",
                "5b40e4035acfc47a87740943",
                "5b432d215acfc4771e1c6624",
                "5b40e1525acfc4771e1c6611",
                "5b40e2bc5acfc40016388216",
                "5c17a7ed2e2216152142459c",
                "5ea17ca01412a1425304d1c0",
                "5f60b34a41e30a4ab12a6947",
                "5ea05cf85ad9772e6624305d",
                "5d6d3716a4b9361bc8618872",
                "5c091a4e0db834001d5addc8",
                "5c0e874186f7745dc7616606",
                "61bca7cda0eae612383adf57",
                "5c0d2727d174af02a012cf58",
                "5f60c74e3b85f6263c145586",
                "5c08f87c0db8340019124324",
                "5c06c6a80db834001b735491",
                "5e4bfc1586f774264f7582d3",
                "5e00c1ad86f774747333222c",
                "5e01ef6886f77445f643baa4",
                "5ca20ee186f774799474abc2",
                "59ef13ca86f77445fd0e2483",
                "572b7fa124597762b472f9d2",
                "59e7708286f7742cbd762753",
                "628e4dd1f477aa12234918aa"
            ],
            "TacticalVest": [
                "5448e5284bdc2dcb718b4567"
            ],
            "SecuredContainer": [
                "5448bf274bdc2dfc2f8b456a"
            ],
            "Backpack": [
                "5448e53e4bdc2d60728b4567"
            ],
            "ArmorVest": [
                "5448e54d4bdc2dcc718b4568"
            ],
            "Pockets": [
                "557596e64bdc2dc2118b4571"
            ],
            "Earpiece": [
                "5645bcc04bdc2d363b8b4572",
                "5aa2ba71e5b5b000137b758f",
                "5b432b965acfc47a8774094e",
                "6033fa48ffd42c541047f728",
                "5c165d832e2216398b5a7e36",
                "5e4d34ca86f774264f758330",
                "5f60cd6cf2bcbb675b00dac6",
                "628e4e576d783146b124c64d"
            ],
            "Dogtag": [
                "59f32bb586f774757e1e8442",
                "59f32c3b86f77472a31742f0"
            ],
            "Eyewear": [
                "5448e5724bdc2ddf718b4568"
            ],
            "ArmBand": [
                "5b3f15d486f77432d0509248"
            ]
        }
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;
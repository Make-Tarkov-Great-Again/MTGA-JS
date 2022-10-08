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
    static async preloadBots() {
        const { database: { core: { gameplay: { bots: { maxPreloadThreshold } } },
            bot: { bots } } } = require('../../app');

        const output = [];
        for (const bot in bots) {
            const type = bots[bot];
            output.bot = [];
            for (const difficulty of type.difficulties) {
                output.bot[difficulty].push(
                    await this.generateBots(null, null,
                        { Role: bot, Limit: maxPreloadThreshold, Difficulty: difficulty })
                );
            }
        }
        return output;
    }

    static async regeneratePreloadedBots() {
        const { database: { bot: { preload },
            core: { gameplay: { bots: { minPreloadThreshold, maxPreloadThreshold } } } }
        } = require('../../app');

        for (const bot in preload) {
            const type = preload[bot];
            for (const difficulty in type) {
                const typeDifficulty = type[difficulty];
                const remainder = Object.keys(typeDifficulty).length;
                if (remainder > minPreloadThreshold) continue;
                else {
                    const sum = maxPreloadThreshold - remainder
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

            output.push(preload[Role][Difficulty].splice(0, Limit))
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
        logger.info(botsParameters);

        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const {
                Role,
                Limit,
                Difficulty
            } = botParameter;
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

        if (role === "pmcBot") logger.debug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

        templateInfo.Nickname = await this.generateNickname(role);
        templateInfo.Side = "Savage";
        templateInfo.Voice = await this.generateVoice(role);
        templateInfo.Settings = await this.generateSettings(templateInfo.Settings, role, difficulty);

        await this.setInfo(templateInfo);
    }

    async generateNickname(role) {
        if (["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"
        ].includes(role)) {
            return getRandomFromArray(database.bot.names.generalFollower);
        } else if (["marksman", "cursedAssault", "playerscav", "assault"].includes(role)) {
            return getRandomFromArray(database.bot.names.scav);
        } else if (["followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            return getRandomFromArray(database.bot.names[role]);
        } else if (["usec", "bear"].includes(role)) {
            return getRandomFromArray(database.bot.names.normal);
        } else {
            if (database.bot.names[role]) {
                return database.bot.names[role][0];
            }
            logger.error(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.error(`Add ${role} to botNames in database/bots and adjust function`);
            return getRandomFromArray(database.bot.names.scav);
        }
    }

    async generateVoice(role) {
        if (role && database.bot.appearance[role]) {
            if (typeof database.bot.appearance[role].Voice !== "string") {
                return getRandomFromObject(database.bot.appearance[role].Voice);
            } else return database.bot.appearance[role].Voice;
        } else if (role && ["assault", "cursedAssault", "marksman"].includes(role)) {
            return getRandomFromObject(database.bot.appearance.scav.Voice);
        } else if (role && ["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role)) {
            return getRandomFromObject(database.bot.appearance.followerGluhar.Voice);
        } else {
            logger.error(`[Bot : generateInfo] Role [${role}] appearance not handled`);
            return getRandomFromObject(database.bot.appearance.random.Voice);
        }
    }

    async generateSettings(settings, role, difficulty) {
        settings.Role = role;
        settings.BotDifficulty = difficulty;

        if (["assault", "cursedAssault", "marksman"].includes(role)) {
            settings.StandingForKill = -0.02;
            settings.AggressorBonus = 0.01;
        } else if (["bossTest", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper",
            "followerSanitar", "followerKojaniy", "followerBully"
        ].includes(role)) {
            settings.StandingForKill = -0.05;
            settings.AggressorBonus = 0.02;

        } else if (["bossBully", "bossSanitar", "bossKilla",
            "bossGluhar", "bossKojaniy", "bossTagilla", "followerKilla"
        ].includes(role)) {
            settings.StandingForKill = -0.2;
            settings.AggressorBonus = 0.05;
        } else if (["followerBirdEye", "followerBigPipe", "exUsec", "bossKnight",
            "sectantWarrior", "sectantPriest", "followerTest",
            "followerTagilla", "pmcBot", "followerGluharSnipe"
        ].includes(role)) {
            settings.StandingForKill = 0;
            settings.AggressorBonus = 0;
        } else if (["usec", "bear"].includes(role)) {
            settings.StandingForKill = 0.01;
            settings.AggressorBonus = 0.02;
        } else if (role === "gifter") {
            settings.StandingForKill = -0.3;
            settings.AggressorBonus = 0.15;
        } else {
            logger.error(`[Bot : generateSettings] Role [${role}] settings not handled`);
            settings.StandingForKill = 0;
            settings.AggressorBonus = 0;
        }

        settings.Experience = await this.generateExperience(role);

        return settings;
    }

    async generateExperience(role) {
        if (["sectantPriest", "bossKilla"].includes(role)) return 1200;

        else if (["bossKojaniy"].includes(role)) return 1100;

        else if (["followerBirdEye", "followerBigPipe", "bossTagilla",
            "bossSanitar", "bossKnight", "bossGluhar", "bossBully"
        ].includes(role)) return 1000;

        else if (["usec", "bear"].includes(role)) return getRandomInt(250, 1000);

        else if (["followerSanitar", "followerKojaniy", "sectantWarrior"].includes(role)) return 600;

        else if (["followerGluharSecurity", "followerGluharAssault"].includes(role)) return 500;

        else if (["followerGluharScout", "followerBully", "bossTest"].includes(role)) return 300;

        else if (["exUsec"].includes(role)) return 225;

        else if (["followerGluharSnipe"].includes(role)) return 0;

        else if (["assault", "cursedAssault", "marksman", "gifter"].includes(role)) return -1;

        else {
            logger.error(`[Bot : generateExperience] Role [${role}] settings not handled`);
            return 0;
        }
    }

    async generateCustomization(role) {
        const templateCustomization = this.template.Customization;

        if (database.bot.appearance[role]) {
            if (typeof database.bot.appearance[role].Head !== "string") {
                templateCustomization.Head = await getRandomFromArray(database.bot.appearance[role].Head);
            } else templateCustomization.Head = database.bot.appearance[role].Head;

            if (typeof database.bot.appearance[role].Body !== "string") {
                templateCustomization.Body = await getRandomFromArray(database.bot.appearance[role].Body);
            } else templateCustomization.Body = database.bot.appearance[role].Body;

            if (typeof database.bot.appearance[role].Hands !== "string") {
                templateCustomization.Hands = await getRandomFromArray(database.bot.appearance[role].Hands);
            } else templateCustomization.Hands = database.bot.appearance[role].Hands;

            if (typeof database.bot.appearance[role].Feet !== "string") {
                if (role === "bossTagilla") {
                    logger.error("The fuck are we doing here?????");
                }
                templateCustomization.Feet = await getRandomFromArray(database.bot.appearance[role].Feet);
            } else templateCustomization.Feet = database.bot.appearance[role].Feet;

        } else if (["assault", "cursedAssault", "marksman"].includes(role)) {

            templateCustomization.Head = await getRandomFromArray(database.bot.appearance.scav.Head);
            templateCustomization.Body = await getRandomFromArray(database.bot.appearance.scav.Body);
            templateCustomization.Hands = await getRandomFromArray(database.bot.appearance.scav.Hands);
            templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.scav.Feet);

        } else if (["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role)) {

            templateCustomization.Head = await getRandomFromArray(database.bot.appearance.followerGluhar.Head);
            templateCustomization.Body = await getRandomFromArray(database.bot.appearance.followerGluhar.Body);
            templateCustomization.Hands = database.bot.appearance.followerGluhar.Hands;
            templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.followerGluhar.Feet);

        } else {
            logger.error(`[Bot : generateCustomization] Role [${role}] customization not handled, randomizing`);
            templateCustomization.Head = await getRandomFromArray(database.bot.appearance.random.Head);
            templateCustomization.Body = await getRandomFromArray(database.bot.appearance.random.Body);
            templateCustomization.Hands = await getRandomFromArray(database.bot.appearance.random.Hands);
            templateCustomization.Feet = await getRandomFromArray(database.bot.appearance.random.Feet);
        }

        await this.setCustomization(templateCustomization);
    }

    async generateHealth(role, difficulty) {
        const health = this.template.Health;
        if (database.bot.bots[role].health && Object.keys(database.bot.bots[role].health).length > 1) {
            Object.assign(health, database.bot.bots[role].health[difficulty]);
        } else if (database.bot.bots[role].health) {
            Object.assign(health, database.bot.bots[role].health);
        } else {
            logger.error(`[Bot : generateHealth] Role [${role}] health not handled`);
            Object.assign(health, database.bot.bots["assault"].health["impossible"]);
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

        const [facecover, facecoverConflicts] = await BotItemGeneration.generateBotFacecover(parentId, role, botSettings.facecoverChance);
        if (facecover)
            output.push(facecover);

        const [helmet, headwearConflicts] = await BotItemGeneration.generateBotHeadwear(parentId, role, facecoverConflicts, botSettings.headwearChance);
        if (helmet)
            output.push(helmet);

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
        const gearEntries = database.bot.bots[role].gearEntries.earpiece.filter(item => !conflictIds.includes(item));
        if (gearEntries && gearEntries.length > 0 && await getRandomInt() <= earpieceChance) {
            const earpieceTemplate = await Item.get(await getRandomFromArray(gearEntries));
            const earpiece = await earpieceTemplate.createAsNewItem();
            earpiece.upd = await Item.createFreshBaseItemUpd(earpiece);
            earpiece.slotId = "Earpiece";
            earpiece.parentId = parentId;
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
    static async generateBotFacecover(parentId, role, facecoverChance) {
        const gearEntries = database.bot.bots[role].gearEntries.facecover;
        if (gearEntries && gearEntries.length > 0 && await getRandomInt() <= facecoverChance) {
            const facecoverTemplate = await Item.get(await getRandomFromArray(gearEntries));
            const facecover = await facecoverTemplate.createAsNewItem();
            facecover.upd = await Item.createFreshBaseItemUpd(facecover);
            facecover.slotId = "FaceCover";
            facecover.parentId = parentId;
            return [facecover, facecoverTemplate._props.ConflictingItems];
        }
        return [false, []];
    }

    /**
     * Generate a headwear item based on the gear entries for bot role
     * @param {string} parentId equipment ID
     * @param {string} role bot role
     * @param {array} conflictIds list of conflicting items to exclude
     * @returns {Promise<array>} final item generate/false & conflicting items
     */
    static async generateBotHeadwear(parentId, role, conflictIds, headwearChance) {
        const gearEntries = database.bot.bots[role].gearEntries.headwear.filter(item => !conflictIds.includes(item));
        if (gearEntries && gearEntries.length > 0 && await getRandomInt() <= headwearChance) {
            const headwearTemplate = await Item.get(await getRandomFromArray(gearEntries));
            const headwear = await headwearTemplate.createAsNewItem();
            headwear.upd = await Item.createFreshBaseItemUpd(headwear);
            headwear.slotId = "Headwear";
            headwear.parentId = parentId;
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
            const botBodyArmor = await armorTemplate.createAsNewItem();
            botBodyArmor.upd = await Item.createFreshBaseItemUpd(armorTemplate);    // TODO: variable durability
            botBodyArmor.slotId = "ArmorVest";
            botBodyArmor.parentId = parentId;
            return botBodyArmor;
        }
        logger.warn("[BotItemGeneration.generateBotGear.generateBotBodyArmor] Bot loadout doesn't have any body armor available.");
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
            const vestTemplate = await Item.get(await getRandomFromArray(gearEntries));
            const botVest = await vestTemplate.createAsNewItem();
            botVest.upd = await Item.createFreshBaseItemUpd(vestTemplate);
            botVest.slotId = "TacticalVest";
            botVest.parentId = parentId;
            return [botVest, vestTemplate._props.BlocksArmorVest];
        }
        logger.warn("[BotItemGeneration.generateBotGear.generateBotRig] Bot loadout doesn't have any vest available.");
        return [false, false];
    }

    static async generateBotMelee(parentId, role) {
        const scabbard = await getRandomFromArray(await BotUtilities.shuffleGearEntries(database.bot.bots[role].gearEntries.melee));
        const scabbardItem = {
            "_id": await generateMongoID(),
            "_tpl": "57e26ea924597715ca604a09",
            "parentId": parentId,
            "slotId": "Scabbard"
        };
        if (scabbard)
            scabbardItem._tpl = scabbard;
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
         * await getRandomFromArray(gearEntries)
         * Primary Weapons To Test:
         * 5644bd2b4bdc2d3b4c8b4572 // AK-74N  // mod_mount_000 (side rail)
         * 5abcbc27d8ce8700182eceeb // AKMSN // mod_stock_akms / mod_pistol_grip_akms
         * 606587252535c57a13424cfd // Mk47 Mutant // mod_stock_001
         * 6165ac306ef05c2ce828ef74 // SCAR // test stocks
         * 
         * Primary Weapons Tested:
         * 
         * Modifications To Test:
         */

        const weapon = await Item.get("5644bd2b4bdc2d3b4c8b4572");

        const assembledWeapon = [];
        if (weapon._props) {

            let weightedList;
            let choices;

            const weaponProps = weapon._props;
            const requiredSlots = await BotUtilities.generateListOfRequiredPartsForWeapon(weaponProps);

            if (weaponProps.weaponUseType === "primary" && slotId == "Holster") {
                logger.info(`Remove ${weapon._id} from gearEntries.primaryWeapon`);
            } else if (weaponProps.weaponUseType !== "secondary" && slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]) {
                logger.info(`Remove ${weapon._id} from gearEntries.Holster`);
            }

            const firecontrol = await this.generateFireControl(weapon, parentId, slotId);
            assembledWeapon.push(firecontrol); //push base of weapon

            //can roll if mod_mount_000 available in Slots, then remove chance for scope that isn't rear sight for reciever

            const ammos = await weapon.generateCompatibleAmmoList();
            weightedList = await BotUtilities.generateWeightedList(ammos)
            choices = await BotUtilities.generateGearEntries(weightedList)

            const magazines = []; // we will use this to shuffle magazines and add them to rigs/pockets

            if (weaponProps.Chambers.length > 0) {
                logger.info(`Weapon has Chamber, we need to generate a "patron_in_weapon" before we continue`);
                const chambers = await weapon.generateChambersList();
                const ammo = await getRandomFromArray(choices);
                const patron_in_weapon = await this.generatePatronInWeapon(chambers, firecontrol._id, ammo);

                if (weaponProps.ReloadMode === "OnlyBarrel") {
                    if (weapon_name.includes("zid_sp81")) {
                        logger.info(`${weapon._id} is a flare-gun, only needs "patron_in_weapon and spare ammo`);
                    }

                    assembledWeapon.push(...patron_in_weapon);
                } else {
                    const magazines = await weapon.generateCompatibleMagazineList(true);

                    weightedList = await BotUtilities.generateWeightedList(Object.keys(magazines));
                    choices = await BotUtilities.generateGearEntries(weightedList);

                    const magazine = magazines[await getRandomFromArray(choices)];

                    // add magazine to weapon, and fill with ammo
                    const [mod_magazine, cartridges] = await this.generateMagazineInWeapon(magazine, firecontrol._id, ammo);

                    /**
                     * Generate shuffled ammo here if we want
                     * let sum = cartridges.upd.StackObjectsCount;
                     */

                    assembledWeapon.push(...patron_in_weapon, mod_magazine, cartridges);

                    for (const magazine of magazines) { // filter magazines that are too large,
                        const { _props: { Width, Height } } = await Item.get(magazine.id);
                        if (Width < 2 && Height <= 2) magazines.push(magazine); //use them later for random magazines in rig/pockets/sc
                    }
                }
            } else {
                switch (weaponProps.ReloadMode) {
                    case "OnlyBarrel":
                        if (weapon_name.includes("rsp30")) logger.info(`This is a flare, remove from gearEntries.${slotId}`);
                        break;
                    case "InternalMagazine":
                        logger.info(`${weapon._id} is a cylinder-based weapon, only needs "mod_magazine" (cylinder) and spare ammo`);
                        //continue cylinder-based weapon from this branch
                        break;
                    case "ExternalMagazine":
                        logger.info(`${weapon._id} is a tube-fed weapon, only needs "mod_magazine" (tube) and spare ammo`);
                }
            }

            let conflictIds = [];

            // mod_sight_rear
            if (requiredSlots.mod_sight_rear) { //can make roll
                weightedList = await BotUtilities.generateWeightedList(requiredSlots.mod_sight_rear.filter)
                choices = await BotUtilities.generateGearEntries(weightedList)

                const rearSight = await getRandomFromArray(choices);
                const mod_sight_rear = await this.generateRearSight(rearSight, requiredSlots.mod_sight_rear.slotId, firecontrol._id, conflictIds);
                assembledWeapon.push(mod_sight_rear);
            }
            // mod_sight rear

            // mod_reciever
            requiredSlots.mod_reciever.filter = requiredSlots.mod_reciever.filter.filter(mod => !conflictIds.includes(mod)); // remove conflictIds from requiredSlots list
            if (requiredSlots.mod_reciever.filter.length > 0) {
                weightedList = await BotUtilities.generateWeightedList(requiredSlots.mod_reciever.filter);
                choices = await BotUtilities.generateGearEntries(weightedList);

                const reciever = await getRandomFromArray(choices);
                // check and roll for mod_sight_rear on reciever
                const mod_receiver = await this.generateReciever(reciever, requiredSlots.mod_reciever.slotId, firecontrol._id, conflictIds);
                assembledWeapon.push(mod_receiver);
            }

            /*             const recieverSlots = await BotUtilities.genereateListOfSlots(await Item.get(reciever));
                        if (recieverSlots) {
                            // do rolls for slots
                            // assembledWeapon.push(...slots);
                        } */

            // mod_reciever

            // mod_gas_block
            if (requiredSlots.mod_gas_block) {
                requiredSlots.mod_gas_block.filter = requiredSlots.mod_gas_block.filter.filter(mod => !conflictIds.includes(mod)); // remove conflictIds from requiredSlots list

                if (requiredSlots.mod_gas_block.filter.length > 0) {
                    weightedList = await BotUtilities.generateWeightedList(requiredSlots.mod_gas_block.filter);
                    choices = await BotUtilities.generateGearEntries(weightedList);

                    const gasblock = await getRandomFromArray(choices);
                    const mod_gas_block = await this.generateGasBlockAndHandguard(gasblock, requiredSlots.mod_gas_block.slotId, firecontrol._id, conflictIds);
                    assembledWeapon.push(...mod_gas_block);
                }
            }
            // mod_gas_block

            //if (requiredSlots["mod_barrel"]) 


            //clear conflictIds because everything that would conflict is now passed
            conflictIds = [];

            // mod_pistol_grip
            weightedList = await BotUtilities.generateWeightedList(requiredSlots.mod_pistol_grip.filter);
            choices = await BotUtilities.generateGearEntries(weightedList);

            const pistolGrip = await getRandomFromArray(choices);
            const mod_pistol_grip = await this.generatePistolGrip(pistolGrip, requiredSlots.mod_pistol_grip.slotId, firecontrol._id, conflictIds);
            assembledWeapon.push(mod_pistol_grip);

            /* const pistolGripSlots = await BotUtilities.genereateListOfSlots(await Item.get(reciever));
            if (pistolGripSlots) {
                // do rolls for slots
                // assembledWeapon.push(...slots);
            } */
            // mod_pistol_grip

            // mod_stock
            requiredSlots.mod_stock.filter = requiredSlots.mod_stock.filter.filter(mod => !conflictIds.includes(mod)); // remove conflictIds from requiredSlots list
            if (requiredSlots.mod_stock.filter.length > 0) {
                weightedList = await BotUtilities.generateWeightedList(requiredSlots.mod_stock.filter);
                choices = await BotUtilities.generateGearEntries(weightedList);

                const stock = await getRandomFromArray(choices);
                const mod_stock = await this.generateAdapterAndOrStock(stock, requiredSlots.mod_stock.slotId, firecontrol._id);
                assembledWeapon.push(...mod_stock);
            }
            // mod_stock          


            //mod_receiver will have ConflictingItems, they need to be pushed to conflictingIds to be searched through
            /**
             * mod_receiver => check for mod_sight_rear, 
             * mod_gas_block, 
             * mod_handguard, 
             * mod_sight_rear (if none on reciever),
             * mod_pistol_grip, mod_pistol_grip_akms
             * mod_stock => { mod_stock_akms
             * 
             * mod_stock_000 is stock for adapter/buffertube
             * mod_stock_001 is 
             * check _props.Slots; for buttpad => mod_stock
             * let stock = await getRandomFromArray(requiredItems["mod_stock"]); slotId = "mod_stock"
             * let adapter; // buffer tube or adapter, don't care because it all `adapts` a stock
             * 
             * if (["_adapter", "_lock", "_stock_tube", "com_spec_std"].includes(stock._name || stock._props.Name)){
             *  adapter = stock;
             *  stock = await getRandomFromArray(bufferTube._props.Slots[0].filters[0].Filter); slotId = "mod_stock_000"
             * }
             */

        }
        //check if weapon is allowed in slot



        /**
         * Create categories for weapons, some weapons don't `require` certain parts
         * 
         * Acquire `FirstPrimaryWeapon` //weapUseType: [primary, secondary] 
         * if (weaponUseType === "secondary") slotId === "Holster"
         * if (weaponUseType === "primary") slotId === ["FirstPrimaryWeapon", "SecondPrimaryWeapon"]
         * 
         * Check `weapon._props.Chambers > 0`
         * 
         * generate `patron_in_weapon` 
         * async generatePatronInWeapon(gun, ammo, role) {
            const chambers = await BotUtilities.getChambers(gun._tpl);
            if (chambers) { // some weapons have no chambers
                return {
                    "_id": await generateMongoID(),
                    "_tpl": ammo,
                    "parentId": gun._id,
                    "slotId": "patron_in_weapon",
                    "upd": {
                        "StackObjectsCount": 1
                    }
                };
            }
            return false;
        }
        static async getChambers(item) {
        const output = [];
        if (!item._props) item = await Item.get(item);
        if (item._props.Chambers) {
            for (const patron of item._props.Chambers) {
                for (const ammo of patron._props.filters) {
                    const data = {
                        "name": patron._name,
                        "ammo": ammo.Filter
                    };
                    if (item._props.Chambers.length === 1) return data;
                    output.push(data); // might be able to remove
                }
            }
            return output; // might be able to remove
        } else return false;
    }
         * 
         * Check `ReloadMode` = if (weapon._props.ReloadMode === "OnlyBarrel") give spare ammo
         * else (acquire "mod_magazine") =>
         *      if (magazine._props.ReloadMagType === "InternalMagazine") load internal, give spare ammo
         *      else fill external mag, give filled spare mags
         * 
         * Acquire `mod_reciever`
         * Build mod_receiver: mod_rear_sight =>
         * mod_barrel: barrel._props.Slots > 0; 
         *      if (mod_gas_block): gasblock._props.Slots > 0; =>
         *      if (mod_muzzle): muzzleModType = ["brake"] //Flashhiders & brakes
         *                                       ["muzzleCombo"] //Muzzle adapters
         *                                       ["conpensators"] //Suppressors
         *                                       => muzzle._props.Slots > 0;
         * 
         * if (mod_handguard) acquire mod_handguard: handguard._props.Slots > 0;
         *                                           if (mod_sight_front) pick one;
         * 
         * Acquire stock
         * stock._props.Slots > 0; "mod_stock_000"
         * 
         * If (mod_charge === required) acquire `mod_charge`
         * if (mod_pistol_grip) acquire `mod_pistol_grip
         * 
         */
        return assembledWeapon;
    }

    static async generateFireControl(weapon, parentId, slotId) {
        const output = await weapon.createAsNewItem();
        output.parentId = parentId;
        output.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(weapon);
        if (upd !== "error") output.upd = upd;

        return output;
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
     * Generate magazine for weapon
     * @param {string} magazine 
     * @param {string} parentId 
     * @returns {<Promise>{}}
     */
    static async generateMagazineInWeapon(magazine, parentId, ammo) {
        const magazineTemplate = await Item.get(magazine.id)
        const newMagazine = await magazineTemplate.createAsNewItemWithParent(parentId);
        newMagazine.slotId = "mod_magazine";

        const cartridges = await this.generateCartridgesInMagazine(ammo, newMagazine._id);
        cartridges.upd.StackObjectsCount = magazine.count;

        return [newMagazine, cartridges];
    }

    /**
     * Generate `cartridges` for magazine; does not fill ammo amount
     * in the chance we want to do random ammo in magazines later on
     * @param {string} ammo 
     * @param {string} parentId 
     * @returns {<Promise>{}}
     */
    static async generateCartridgesInMagazine(ammo, parentId) {
        const ammoTemplate = await Item.get(ammo);
        const output = await ammoTemplate.createAsNewItemWithParent(parentId);
        output.slotId = "cartridges"
        output.upd = {
            StackObjectsCount: 0
        }
        return output;
    }

    /**
     * Generate rear sight for Weapon, return object and updated conflictIds
     * @param {string} rearSight 
     * @param {string} slotId 
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>{}}
     */
    static async generateRearSight(rearSight, slotId, parentId, conflictIds) {
        const rearSightTemplate = await Item.get(rearSight);
        const output = await rearSightTemplate.createAsNewItemWithParent(parentId);
        output.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(rearSightTemplate);
        if (upd !== "error") output.upd = upd;

        conflictIds.push(...rearSightTemplate._props.ConflictingItems);
        return output;
    }

    /**
     * Generate upper reciever/dustcover for weapon, return object and updated conflictIds
     * @param {string} reciever
     * @param {string} slotId
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>{}}
     */
    static async generateReciever(reciever, slotId, parentId, conflictIds) {
        const recieverTemplate = await Item.get(reciever);
        const output = await recieverTemplate.createAsNewItemWithParent(parentId);
        output.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(recieverTemplate);
        if (upd !== "error") output.upd = upd;

        conflictIds.push(...recieverTemplate._props.ConflictingItems);
        return output;
    }

    /**
     * Generate gasblock and handguard (if applicable) for weapon, 
     * return array of object(s) and updated conflictIds
     * @param {string} gasblock 
     * @param {string} slotId
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>[{}]}
     */
    static async generateGasBlockAndHandguard(gasblock, slotId, parentId, conflictIds) {
        const output = [];

        const gasblockTemplate = await Item.get(gasblock);
        const mod_gas_block = await gasblockTemplate.createAsNewItemWithParent(parentId);
        mod_gas_block.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(gasblockTemplate);
        if (upd !== "error") mod_gas_block.upd = upd;

        conflictIds.push(...gasblockTemplate._props.ConflictingItems);
        output.push(mod_gas_block);

        const gasblockSlots = await BotUtilities.genereateListOfSlots(gasblockTemplate);
        if (gasblockSlots.mod_handguard) {
            const weightedList = await BotUtilities.generateWeightedList(gasblockSlots.mod_handguard.filter);
            const choices = await BotUtilities.generateGearEntries(weightedList);

            const handguard = await getRandomFromArray(choices);
            const mod_handguard = await this.generateHandguard(handguard, gasblockSlots.mod_handguard.slotId, mod_gas_block._id, conflictIds);
            output.push(mod_handguard);
        }
        return output;
    }

    /**
     * Generate handguard for weapon, return object and updated conflictIds
     * @param {string} handguard 
     * @param {string} slotId
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>{}}
     */
    static async generateHandguard(handguard, slotId, parentId, conflictIds) {
        const handguardTemplate = await Item.get(handguard);
        const output = await handguardTemplate.createAsNewItemWithParent(parentId);
        output.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(handguardTemplate);
        if (upd !== "error") output.upd = upd;

        conflictIds.push(...handguardTemplate._props.ConflictingItems);
        return output;
    }

    /**
     * Generate pistolGrip for weapon, return object and updated conflictIds
     * @param {string} pistolGrip 
     * @param {string} slotId for whatever reason we have differently named grip slotIds
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>{}}
     */
    static async generatePistolGrip(pistolGrip, slotId, parentId, conflictIds) {
        const pistolGripTemplate = await Item.get(pistolGrip);
        const output = await pistolGripTemplate.createAsNewItemWithParent(parentId);
        output.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(pistolGripTemplate);
        if (upd !== "error") output.upd = upd;

        conflictIds.push(...pistolGripTemplate._props.ConflictingItems);
        return output;
    }

    /**
     * Generate buffer-tube/adapter and/or stock, return array of objects
     * @param {string} anomaly either stock or buffer-tube/adapter
     * @param {string} slotId 
     * @param {string} parentId 
     * @param {[string]} conflictIds 
     * @returns {<Promise>[{}]}
     */
    static async generateAdapterAndOrStock(anomaly, slotId, parentId) {
        const output = [];

        let stockTemplate = await Item.get(anomaly);
        let adapterTemplate;

        const check = [
            "_adapter",
            "_lock",
            "_stock_tube",
            "_com_spec_std",
            "caa_akts"
        ].some(condition => stockTemplate._name.includes(condition));

        if (check) {
            adapterTemplate = stockTemplate;
            const mod_adapter = await adapterTemplate.createAsNewItemWithParent(parentId);
            mod_adapter.slotId = slotId;
            let upd = await Item.createFreshBaseItemUpd(adapterTemplate);
            if (upd !== "error") mod_adapter.upd = upd;

            output.push(mod_adapter);


            const adapterSlots = await BotUtilities.genereateListOfSlots(adapterTemplate);
            let weightedList = await BotUtilities.generateWeightedList(adapterSlots["mod_stock"].filter);
            let choices = await BotUtilities.generateGearEntries(weightedList);
            const stock = await getRandomFromArray(choices);

            stockTemplate = await Item.get(stock);
            const mod_stock = await stockTemplate.createAsNewItemWithParent(mod_adapter._id);
            mod_stock.slotId = adapterSlots["mod_stock"].slotId
            upd = await Item.createFreshBaseItemUpd(stockTemplate);
            if (upd !== "error") mod_stock.upd = upd;

            output.push(mod_stock);
            if (["mod_stock_001", "mod_stock_002"].includes(adapterSlots)) logger.info("do a roll for stock attachments");
        }
        else {
            const mod_stock = await stockTemplate.createAsNewItemWithParent(parentId);
            mod_stock.slotId = slotId;
            const upd = await Item.createFreshBaseItemUpd(stockTemplate);
            if (upd !== "error") mod_stock.upd = upd;

            output.push(mod_stock);
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
        const pocket = authorizedGear.pocket ? await getRandomFromArray(authorizedGear.pocket) : "557ffd194bdc2d28148b457f"

        const pocketsTemplate = await Item.get(pocket);
        const output = await pocketsTemplate.createAsNewItemWithParent(parentId);
        output.slotId = "Pockets";
        const upd = await Item.createFreshBaseItemUpd(pocketsTemplate);
        if (upd !== "error") output.upd = upd;

        return output;
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
            const backpackTemplate = await Item.get(await getRandomFromArray(gearEntries));
            const backpack = await backpackTemplate.createAsNewItem();
            backpack.slotId = "Backpack";
            backpack.parentId = parentId;
            return backpack;
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
        const securedContainerTemplate = await Item.get("5c0a794586f77461c458f892");
        const output = await securedContainerTemplate.createAsNewItemWithParent(parentId);
        output.slotId = "SecuredContainer";
        const upd = await Item.createFreshBaseItemUpd(securedContainerTemplate);
        if (upd !== "error") output.upd = upd;

        return output;
    }
}

class BotUtilities {

    static async generateListOfRequiredPartsForWeapon(props) {
        const slots = props.Slots;
        const output = {};

        let name;
        let check;
        slots.find(slot => {
            if (slot._required === true) {
                check = slot._name.indexOf("mod_pistol_grip");
                if (check !== -1) name = "mod_pistol_grip"
                else name = slot._name;

                output[name] = {
                    slotId: slot._name,
                    filter: slot._props.filters[0].Filter
                }
            }
            // these are required for proper bot generation
            else {
                check = ["mod_reciever", "mod_sight_rear", "mod_stock", "mod_muzzle"].includes(slot._name);
                if (check) {
                    if (slot._name.indexOf("_stock") !== -1) name = "mod_stock"
                    else name = slot._name;

                    output[name] = {
                        slotId: slot._name,
                        filter: slot._props.filters[0].Filter
                    }
                }
            }
        })
        return output;
    }

    static async genereateListOfSlots(item) {
        if (!item._props) return false;
        if (!item._props.Slots) return false;
        const slots = item._props.Slots;
        const output = {}

        slots.find(slot => {
            output[slot._name] = {
                slotId: slot._name,
                filter: slot._props.filters[0].Filter
            }
        });
        return output;
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

    static async shuffleGearEntries(gearEntries) {
        for (let index = gearEntries.length - 1; index > 0; index--) {
            const newIndex = await floor(Math.random() * (index + 1));
            const entrie = gearEntries[index];
            gearEntries[index] = gearEntries[newIndex]; // replace the current entrie at given index with the picked entrie
            gearEntries[newIndex] = entrie;
        }
        return gearEntries;
    }

    static async generateChildren(parent, children, newId) {
        const output = [];
        for (const child of children) {

            if (child.parentId === parent._id) {
                //check if this item has children in the array
                const grandchildren = await this.generateChildren(child, children, child._id);

                const item = cloneDeep(child);
                item._id = await generateMongoID();
                item.parentId = newId;

                if (grandchildren) {
                    for (const grandchild of grandchildren) {
                        grandchild.parentId = item._id;
                        output.push(grandchild);
                    }
                }
                output.push(item);
            }
        }
        if (output.length > 0) return output;
        else return false;
    }

    static async checkForConflicts(item, filter) {
        for (const conflict of filter) {
            if (item === conflict) {
                return true;
            }
        }
        return false;
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
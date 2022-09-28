const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { ItemNode } = require("./ItemNode");
const {
    generateMongoID,
    logger,
    generateRandomInt,
    getRandomFromArray,
    getRandomFromObject,
    getPercentRandomBool,
    getRandomInt,
    round,
    floor
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
     * Generate a list of bot corresponding to the give conditions in request
     * @param {Request} request
     * @param {Reply} reply
     */
    static async generateBots(request, _reply) {
        const botsParameters = request.body.conditions;
        logger.console(botsParameters);

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

        else if (["usec", "bear"].includes(role)) return generateRandomInt(250, 1000);

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
        
        this.generateLootInPockets();

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
 
        let hasWeapon = false;
        if (await getRandomInt() <= botSettings.holsterWeaponChance) {
            const [weapon, compatibleMagazines, compatibleAmmo] = await BotItemGeneration.generateBotWeapon(parentId, role, "Holster");
            if (weapon) {
                hasWeapon = true;
                output.push(...weapon);
                const ammo = await BotItemGeneration.generateBotAmmo(botVest, securedContainer, compatibleMagazines, compatibleAmmo);
                if (ammo)
                    output.push(...ammo);
            }
        }

        if (await getRandomInt() <= botSettings.primaryWeaponChance || !hasWeapon) {
            const [weapon, compatibleMagazines, compatibleAmmo] = await BotItemGeneration.generateBotWeapon(parentId, role, "FirstPrimaryWeapon");
            if (weapon) {
                output.push(...weapon);
                const ammo = await BotItemGeneration.generateBotAmmo(botVest, securedContainer, compatibleMagazines, compatibleAmmo);
                if (ammo)
                    output.push(...ammo);
            }
            // if we don't have a primary weapon, it's dumb to generate a secondary weapon for the back slot.
            if (await getRandomInt() <= botSettings.secondaryWeaponChance) {
                const [weapon, compatibleMagazines, compatibleAmmo] = await BotItemGeneration.generateBotWeapon(parentId, role, "SecondPrimaryWeapon");
                if (weapon) {
                    output.push(...weapon);
                    const ammo = await BotItemGeneration.generateBotAmmo(botVest, securedContainer, compatibleMagazines, compatibleAmmo);
                    if (ammo)
                        output.push(...ammo);
                }
            }
        }

        return output;
    }

    async generateLootInPockets(parentId = this.generateInventoryItems.parentId, freeSlot)
    {
        //The IDs of various items in ItemEntries are subject to change! These are just test Items.
        const ItemEntries = [
            "544fb45d4bdc2dee738b4568", //Salewa
            "5d02778e86f774203e7dedbe", //Core Medical Surgical Kit
            "590c5f0d86f77413997acfab",  // MRE Ration Pack
            "5909d24f86f77466f56e6855" // Medbag
        ]
        const newItemTemplate = await Item.getItem(await getRandomFromArray(ItemEntries));
        const newItem = await newItemTemplate.createAsNewItem();
        const upd = await Item.createFreshBaseItemUpd(newItemTemplate);
        if (upd !== "error"){
           newItem.upd = upd;
        }
        newItem.parentId = this.parentId;
        newItem.slotId  = freeSlot.slotID;                                                                                                                                    
        output.push(newItem);

    }

    async generateVisor(parentId, role, conflicts, listPredefinedItems = false)
    {
        let visors;
        if (!listPredefinedItems) {
            visors = await BotUtilities.generateLootBucket("Eyewear", role);
        } else {
            visors = listPredefinedItems;
        }
        const visor = await Item.get(await getRandomFromArray(visors));
        const check = await BotUtilities.checkForConflicts(visor._id, conflicts)
        if (!check) {
            const data = await this.createVisor(parentId, visor)
            if (visor._props.ConflictingItems) data.conflicts = visor._props.ConflictingItems;
            return data;
        }
        return false;
    }

    async createVisor(parentId, visor) 
    {
        return {
            "visor": {
                "_id": await generateMongoID(),
                "_tpl": visor._id,
                "parentId": parentId,
                "slotId": "Eyewear"
            },
            "conflicts": []
        };
    }

    async generateAmmo(gun, role) {
        if (!gun._props)
            gun = await Item.get(gun._tpl);

        let caliber = await gun.getProperty("ammoCaliber");
        if (caliber === "Caliber9x18PMM") {
            caliber = "Caliber9x18PM";
        }
        const allAmmoItems = await ItemNode.getNodeChildrenByName("Ammo");
        const allAmmoForCaliber = allAmmoItems.filter(ammo => ammo._props.Caliber === caliber);
        const pickedAmmo = await getRandomFromArray(allAmmoForCaliber);
        return pickedAmmo._id;
    }

    async generatePatronInWeapon(gun, ammo, role) {
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

    async generateCartridge(gun, ammo, role) {
        const loadedCartridges = [];

        const cartridges = await BotUtilities.getSlots(gun._tpl, "mod_magazine");
        const cartridge = await BotUtilities.generateCartridgeData(
            await getRandomFromArray(cartridges)
        );

        const magazine = await this.createCartridge(gun._id, cartridge);
        const loadedCartridge = await this.generateLoadedCartridge(
            cartridge.count,
            ammo,
            magazine._id
        );

        loadedCartridges.push(magazine, loadedCartridge);
        return loadedCartridges;
    }

    async createCartridge(parentId, cartridge) {
        return {
            "_id": await generateMongoID(),
            "_tpl": cartridge._tpl,
            "parentId": parentId,
            "slotId": "mod_magazine"
        };
    }

    async generateLoadedCartridge(count, ammo, parentId) {
        return {
            "_id": await generateMongoID(),
            "_tpl": ammo,
            "parentId": parentId,
            "slotId": "cartridges",
            "upd": {
                "StackObjectsCount": count
            }
        };
    }

    async createAmmoStack(ammo, parentId) {
        return {
            "_id": await generateMongoID(),
            "_tpl": ammo._id,
            "parentId": parentId,
            "slotId": "",
            "upd": {
                "StackObjectsCount": ammo._props.StackMaxSize
            }
        };
    }
}

class BotItemGeneration {

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
        let gearEntries = database.bot.bots[role].gearEntries;
        if (slotId === "Holster")
            gearEntries = gearEntries.holster;
        else if (slotId === "FirstPrimaryWeapon")
            gearEntries = gearEntries.primaryWeapon;
        else
            gearEntries = gearEntries.secondaryWeapon;

        if (!gearEntries || gearEntries.length === 0) {
            logger.warn(`[BotItemGeneration.generateBotGear.generateBotWeapon] Bot loadout doesn't have any ${slotId} weapon available.`);
            return [false, false, false];
        }
        const weaponTemplate = await Item.get(await getRandomFromArray(gearEntries));
        const compatibleMagazines = await weaponTemplate.generateCompatibleMagazineList();
        const compatibleAmmo = await weaponTemplate.generateCompatibleAmmoList();
        const receiver = await weaponTemplate.createAsNewItem();
        receiver.parentId = parentId;
        receiver.slotId = slotId;
        const upd = await Item.createFreshBaseItemUpd(weaponTemplate);
        if (upd !== "error")
            receiver.upd = upd;
        const conflictIds = [];
        const partsTemplates = [receiver];
        for (const part of partsTemplates) {
            partsTemplates.push(...await BotItemGeneration.generateWeaponParts(part, conflictIds));
        }
        return [partsTemplates, compatibleMagazines, compatibleAmmo];
    }

    static async generateWeaponParts(part, conflictIds, optional = false) {
        const parts = [];
        const partTemplate = await Item.get(part._tpl);
        const slots = partTemplate._props.Slots; // .filter(slot => slot._name !== 'mod_reciever')
        for (const slot of slots) {
            if (!optional && !slot._required)
                continue;
            const validMods = slot._props.filters[0].Filter.filter(mod => !conflictIds.includes(mod));
            if (validMods.length > 0) {
                const weightedListPart = await BotUtilities.generateWeightedList(validMods);
                const entries = await BotUtilities.generateGearEntries(weightedListPart);
                const modTemplate = await Item.get(await getRandomFromArray(entries));
                if (modTemplate._props.ConflictingItems.length > 0)
                    conflictIds.push(...modTemplate._props.ConflictingItems);
                const newItem = await modTemplate.createAsNewItem();
                const upd = await Item.createFreshBaseItemUpd(modTemplate);
                if (upd !== "error")
                    newItem.upd = upd;
                newItem.parentId = part._id;
                newItem.slotId = slot._name;
                parts.push(newItem);
            }
        }
        return parts;
    }

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

    /**
     * Generate magazines previously picked in the list of compatible mags lst with ammo from the compatible ammo lst with in vest slots.
     * @param {object} rig generated vest
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
        const pockets = {
            "_id": await generateMongoID(),
            "_tpl": "557ffd194bdc2d28148b457f",
            "parentId": parentId,
            "slotId": "Pockets"
        };
        if (authorizedGear.pocket && authorizedGear.pocket.length > 0)
            pockets._tpl = await getRandomFromArray(authorizedGear.pocket);
        else
            logger.warn("[BotItemGeneration.generateBotGear.generateBotPockets] Bot loadout doesn't have any pockets, use default one.");
        return pockets;
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
     * Generate ammo for parent
     * @param {string} parentId id of item were the stack will be
     * @param {string} ammo id of the ammo item
     * @param {string} magTpl id of the magazine item if there is one
     * @returns {Promise<object>} stack of ammo
     */
    static async generateAmmo(parentId, ammo, magTpl = false) {
        const ammoTemplate = await Item.get(ammo);
        const newAmmoStack = await ammoTemplate.createAsNewItem();
        newAmmoStack.upd = await Item.createFreshBaseItemUpd(ammoTemplate);
        newAmmoStack.parentId = parentId;
        if (magTpl) {
            const magazine = await Item.get(magTpl);
            newAmmoStack.upd.StackObjectsCount = magazine._props.Cartridges[0]._max_count;
            newAmmoStack.slotId = "cartridges";
        }
        return newAmmoStack;
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
        return {
            "_id": await generateMongoID(),
            "_tpl": "5c0a794586f77461c458f892",
            "parentId": parentId,
            "slotId": "SecuredContainer"
        };
    }


    static async generateBotAmmo(rig, securedContainer, compatibleMagazines, compatibleAmmo) {
        const output = [];
        let magPicked = false;
        if (compatibleMagazines) {
            while (!magPicked) {
                const pickedMag = await getRandomFromArray(compatibleMagazines);
                const templateMag = await Item.get(pickedMag);
                const magSize = await templateMag.getSize();
                const freeSlot = await Item.getFreeSlot(rig, output, magSize.width, magSize.height);
                if (freeSlot)
                    magPicked = templateMag;
            }
            const rigsMags = await BotItemGeneration.generateMagazinesInContainer(rig, magPicked, await getRandomInt(2, 4));
            output.push(...rigsMags);
            const securedContainerMags = await BotItemGeneration.generateMagazinesInContainer(securedContainer, magPicked, 5);
            output.push(...securedContainerMags);
            for (const mag of rigsMags) {
                output.push(await BotItemGeneration.generateAmmo(mag._id, await getRandomFromArray(compatibleAmmo), mag._tpl));
            }
            for (const mag of securedContainerMags) {
                output.push(await BotItemGeneration.generateAmmo(mag._id, await getRandomFromArray(compatibleAmmo), mag._tpl));
            }
        }
        return output;
    }
}

class BotUtilities {

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

    /**
     * Get filter of item based on Slots._name or Slots._id
     * using the _tpl or _id of the item
     * @param {*} item
     * @param {*} slotId
     * @returns
     */
    static async getSlots(item, slotId) {
        if (!item._props) item = await Item.get(item);
        if (item._props.Slots) {
            for (const slot of item._props.Slots) {
                if ([slot._name, slot._id].includes(slotId)) {
                    for (const filter of slot._props.filters) {
                        if (filter.Filter) {
                            return filter.Filter;
                        }
                    }
                }
            }
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

    static async generateCylinder(cylinder, ammo, parentId) {
        const output = [];
        for (const chamber of cylinder) {
            const data = {
                "_id": await generateMongoID(),
                "_tpl": ammo,
                "parentId": parentId,
                "slotId": chamber.name,
                "upd": {
                    "StackObjectsCount": chamber.ammo
                }
            };
            output.push(data);
        }
        return output;
    }

    static async generateCartridgeData(cartridge) {
        const output = {};

        output["_tpl"] = cartridge; //set templateId of cartridge for use later
        if (!cartridge._id) cartridge = await Item.get(cartridge);
        if (cartridge._props.Cartridges) {
            for (const ammo of cartridge._props.Cartridges) {
                output["_name"] = ammo._name;
                output["count"] = ammo._max_count;
            }
        }
        return output;
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

    /**
     * Generate loot pool based on rarity, and item type based on Default Inventory
     * @param {*} itemType
     * @param {*} role
     * @returns
     */
    static async generateLootBucket(itemType, _role, subItemType = null) {
        const data = database.core.rarity;
        const chances = data.Chance.Global; //default chances until roles are implemented

        let item = data[itemType];
        if (subItemType) item = item[subItemType];

        const lootbucket = [];
        for (const chance in chances) {
            if (!item[chance]) continue;
            if (await getPercentRandomBool(chances[chance])) {
                lootbucket.push(...item[chance]);
            }
        }

        if (subItemType) return lootbucket;
        else return BotUtilities.generateAllowedItems(lootbucket, itemType);
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
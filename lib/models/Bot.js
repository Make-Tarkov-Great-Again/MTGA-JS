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
    getRandomInt
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
        logger.logConsole(botsParameters);

        const generatedBots = [];
        for (const botParameter of botsParameters) {
            let {
                Role,
                Limit,
                Difficulty
            } = botParameter;

            await BotUtilities.generateGearEntries(Role);

            for (let i = 0; i < Limit; i++) {
                const newBot = new Bot();

                //Role = "assault";
                //Difficulty = "normal";

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

        if (role === "pmcBot") logger.logDebug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

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
            logger.logError(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.logError(`Add ${role} to botNames in database/bots and adjust function`);
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
            logger.logError(`[Bot : generateInfo] Role [${role}] appearance not handled`);
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
            logger.logError(`[Bot : generateSettings] Role [${role}] settings not handled`);
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
            logger.logError(`[Bot : generateExperience] Role [${role}] settings not handled`);
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
                    logger.logError("The fuck are we doing here?????");
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
            logger.logError(`[Bot : generateCustomization] Role [${role}] customization not handled, randomizing`);
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
            logger.logError(`[Bot : generateHealth] Role [${role}] health not handled`);
            Object.assign(health, database.bot.bots["assault"].health["impossible"]);
        }
        return this.setHealth(health);
    }

    async generateInventory(role) {
        const templateInventory = this.template.Inventory;
        const templateItems = templateInventory.items;

        // begin divide and conquer

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

        //initiate divide
        const botDefaultInventory = await this.generateInventoryItems(
            templateInventory.equipment, role);
        templateItems.push(...botDefaultInventory);

        // initiate conquer
        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(parentId, role) {
        const output = [];
        //const dogtag = await this.generateDogtag(parentId);
        //const armband = await this.generateArmband(parentId);
        const scabbard = await this.generateScabbard(parentId);
        output.push(scabbard);
        /* modularize base weapon generation to accomodate for multiple slots */
        // TODO: determine if bot is a pistolero or a virgin primary user
        const [weapon, compatibleMagazines, compatibleAmmo] = await BotItemGeneration.generateBotWeapon(parentId, role);
        output.push(...weapon);
        const botRig = await BotItemGeneration.generateBotRig(parentId, role);
        if (botRig) {
            output.push(botRig);
            // TODO: generate more loot in the botRig ? loose ammo, meds...
            const generatedMagazines = await BotItemGeneration.generateMagazinesInBotRig(botRig, compatibleMagazines, compatibleAmmo);
            output.push(...generatedMagazines);
        }
        const botPocket = await BotItemGeneration.generateBotPockets(parentId, role);
        output.push(botPocket);
        // TODO: generate loot in pockets ? Loose bullets ? Money ? Bandages ? Grenades ?
        const botBackpack = await BotItemGeneration.generateBotBackpack(parentId, role);
        if (botBackpack) {
            output.push(botBackpack);
            // TODO: generate loot in backpack: valuable, hideout items, barter stuff...
        }
        const securedContainer = await BotItemGeneration.generateSecuredContainer(parentId);
        output.push(securedContainer);
        // TODO: copy magazine from the rig inside the securedContainer with new ids
        const bodyArmor = await BotItemGeneration.generateBotBodyArmor(parentId, role, botRig._tpl);
        if (bodyArmor) {
            output.push(bodyArmor);
        }
        return output;
        /*const ammo = await this.generateAmmo(weapon[0], role);
        //const patronInWeapon = await this.generatePatronInWeapon(weapon[0], ammoUsed, role);
        //output.push(patronInWeapon);
        //let cartridge;
        //if (weapon.find(part => part.slotId === "mod_magazine")) {
        //    cartridge = await this.generateCartridge(weapon[0], ammo, role,);
        //}

        //split weapons from its modifications, split modifications into required and optional 
        //const required = await this.generateRequiredForWeaponInSlot(weapons, parentId, role);
        //const optional = await this.generateOptionalForWeaponInSlot(weapons, parentId, role);

        // depends on a dynamic item generation function
        //const head = await this.generateHeadAccessory(parentId, role);
        //return [...weapon, patronInWeapon, ...cartridge, scabbard, ...securedContainer];*/
    }


    async generateHeadAccessory(parentId, role) {
        const output = [];
        const conflicts = [];
        // VERY RAW IMPLEMENTATION OF PREDEFINED ACCESSORIES
        if (database.bot.bots[role].loadout) {
            const loadout = database.bot.bots[role].loadout;
            if (loadout.FaceCover) {
                const facecover = await this.generateFaceCover(parentId, role, conflicts, loadout.FaceCover);
                output.push(facecover.facecover);
                conflicts.push(...facecover.conflicts);
            }
            if (loadout.Headwear) {
                const headwear = await this.generateHeadwear(parentId, role, conflicts, loadout.Headwear);
                output.push(headwear.headwear);
                conflicts.push(...headwear.conflicts);
            }
            // TODO: bind visor generation to headwear/facecover, I'll see when I'll do Killa loadout
            // TODO: handle drippy eyes pro
            if (loadout.EarPiece) {
                const earpiece = await this.generateEarpiece(parentId, role, conflicts, loadout.EarPiece);
                output.push(earpiece.earpiece);
                conflicts.push(...earpiece.conflicts);
            }

        } else {
            if (await getPercentRandomBool(25)) { // 25% chance of generating a facecover
                const facecover = await this.generateFaceCover(parentId, role, conflicts)
                if (facecover) {
                    output.push(facecover.facecover); // add facecover and loot output
                    conflicts.push(...facecover.conflicts);
                }
            }

            if (await getPercentRandomBool(25)) { // 25% chance of generating an earpiece
                const earpiece = await this.generateEarpiece(parentId, role, conflicts)
                if (earpiece) {
                    output.push(earpiece.earpiece); // add earpiece and loot output
                    conflicts.push(...earpiece.conflicts);
                }
            }

            if (await getPercentRandomBool(25)) { // 25% chance of generating a visor
                const visor = await this.generateVisor(parentId, role, conflicts)
                if (visor) {
                    output.push(visor.visor); // add visor and loot output
                    conflicts.push(...visor.conflicts);
                }
            }

            if (await getPercentRandomBool(25)) { // 25% chance of generating a headwear
                const headwear = await this.generateHeadwear(parentId, role, conflicts)
                if (headwear) {
                    output.push(headwear.headwear); // add headwear and loot output
                    conflicts.push(...headwear.conflicts);
                }
            }
        }

        return output;
    }

    async generateHeadwear(parentId, role, conflicts, listPredefinedItems=false) {
        let headwears;
        if (!listPredefinedItems) {
            headwears = await BotUtilities.generateLootBucket("Headwear", role);
        } else {
            headwears = listPredefinedItems;
        }
        const headwear = await Item.get(await getRandomFromArray(headwears));
        const check = await BotUtilities.checkForConflicts(headwear._id, conflicts);
        if (!check) {
            const data = await this.createHeadwear(parentId, headwear);
            if (headwear._props.ConflictingItems) data.conflicts = headwear._props.ConflictingItems;
            return data;
        }
        return false;
    }

    async createHeadwear(parentId, headwear) {
        return {
            "headwear": {
                "_id": await generateMongoID(),
                "_tpl": headwear._id,
                "parentId": parentId,
                "slotId": "Headwear"
            },
            "conflicts": [],
            "attachments": []
        };
    }

    async generateFaceCover(parentId, role, conflicts, listPredefinedItems=false) {
        let facecovers;
        if (!listPredefinedItems) {
            facecovers = await BotUtilities.generateLootBucket("FaceCover", role);
        } else {
            facecovers = listPredefinedItems;
        }
        const facecover = await Item.get(await getRandomFromArray(facecovers));

        const check = await BotUtilities.checkForConflicts(facecover._id, conflicts);
        if (!check) {
            const data = await this.createFaceCover(parentId, facecover);
            if (facecover._props.ConflictingItems) data.conflicts = facecover._props.ConflictingItems;
            return data;
        }
        return false;
    }

    async createFaceCover(parentId, facecover) {
        return {
            "facecover": {
                "_id": await generateMongoID(),
                "_tpl": facecover._id,
                "parentId": parentId,
                "slotId": "FaceCover"
            },
            "conflicts": [],
            "attachments": []
        }
    }

    async generateEarpiece(parentId, role, conflicts, listPredefinedItems=false) {
        let earpieces;
        if (!listPredefinedItems) {
            earpieces = await BotUtilities.generateLootBucket("Earpiece", role);
        } else {
            earpieces = listPredefinedItems;
        }
        const earpiece = await Item.get(await getRandomFromArray(earpieces));
        const check = await BotUtilities.checkForConflicts(earpiece._id, conflicts)
        if (!check) {
            const data = await this.createEarpiece(parentId, earpiece)
            if (earpiece._props.ConflictingItems) data.conflicts = earpiece._props.ConflictingItems;
            return data;
        }
        return false;
    }

    async createEarpiece(parentId, earpiece) {
        return {
            "earpiece": {
                "_id": await generateMongoID(),
                "_tpl": earpiece._id,
                "parentId": parentId,
                "slotId": "Earpiece"
            },
            "conflicts": []
        };
    }

    async generateVisor(parentId, role, conflicts, listPredefinedItems=false) {
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

    async createVisor(parentId, visor) {
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

    async generateScabbard(parentId, role) {
        const lootbucket = await BotUtilities.generateLootBucket("Scabbard", role);
        const scabbard = await getRandomFromArray(lootbucket);

        return {
            "_id": await generateMongoID(),
            "_tpl": scabbard,
            "parentId": parentId,
            "slotId": "Scabbard"
        };
    }

    async generateItemsInContainer(items, container) {
        const output = [];
        for (const item of items) {
            Object.defineProperty(item, "location", { value: { x: 0, y: 0, r: 0 }, writable: true });
            const data = await Item.get(item._tpl);
            if (data) {
                const size = await data.getSize();
                item.location =  await Item.getFreeSlot(
                    container,
                    this.template.Inventory.items,
                    size.width,
                    size.height
                );
                output.push(item);
            }
        }
        return output;
    }

    async createWeaponForSlot(parentId, role, slotId = null) {
        // cannot wait to destroy this mess below
        const newId = await generateMongoID();
        let pickedWeapon;
        if (slotId === "FirstPrimaryWeapon") {
            pickedWeapon = await getRandomFromArray(database.bot.bots[role].gearEntries.primaryWeapon);
        } else {
            pickedWeapon = await getRandomFromArray(database.bot.bots[role].gearEntries.secondaryWeapon);
        }
        const weaponPreset = Object.values(await Preset.get(pickedWeapon)).find(preset => preset._encyclopedia);
        const weaponParts = await cloneDeep(weaponPreset._items);
        const durability = await getRandomInt(50, 100);
        const maxDurability = await getRandomInt(20, durability);
        weaponParts[0].upd = {
            "Repairable": {
                "Durability": durability,
                "MaxDurability": maxDurability
            }
        };
        weaponParts[0].slotId = slotId;
        const weapon = await BotUtilities.generateChildren(
            weaponParts[0],
            weaponParts,
            newId
        );
        weaponParts[0]._id = newId;
        weaponParts[0].parentId = parentId;
        weapon.unshift(weaponParts[0]);
        // end of mess
        return weapon;
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
        } return false;
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

    static async generateBotWeapon(parentId, role) {
        // TODO: Generate pistol only bots
        const gearEntries = database.bot.bots[role].gearEntries;
        if (!gearEntries.primaryWeapon) {
            logger.logError("[BotItemGeneration.generateBotGear.generateBotWeapon] Bot loadout doesn't have any available primaryWeapon.");
            return false;
        }
        const weaponTemplate = await Item.get(await getRandomFromArray(gearEntries.primaryWeapon));
        const compatibleMagazines = await weaponTemplate.generateCompatibleMagazineList();
        const compatibleAmmo = await weaponTemplate.generateCompatibleAmmoList();
        const weaponPreset = Object.values(await Preset.get(weaponTemplate._id)).find(preset => preset._encyclopedia);
        const weaponParts = await cloneDeep(weaponPreset._items);
        for (const partIndex in weaponParts) {
            const part = weaponParts[partIndex];
            if (part.slotId === "mod_magazine") {
                const magazineTemplate = await Item.get(part._tpl);
                const bulletId = await getRandomFromArray(compatibleAmmo);
                const bulletTemplate = await Item.get(bulletId);
                const bulletItem = await bulletTemplate.createAsNewItem();
                bulletItem.upd = { "StackObjectsCount": magazineTemplate._props.Cartridges[0]._max_count };
                bulletItem.parentId = part._id;
                bulletItem.slotId = "cartridges";
                weaponParts.push(bulletItem);
                break;
            }
        }
        weaponParts[0].parentId = parentId;
        weaponParts[0].slotId = "FirstPrimaryWeapon";
        return [weaponParts, compatibleMagazines, compatibleAmmo];
    }

    /**
     * Generate a body armor item based on the gear entries for bot role
     * @param {string} parentId equipment ID
     * @param {object} gearEntries allowed items for this role
     * @returns {Promise<object>} final item generated or false
     */
    static async generateBotBodyArmor(parentId, role, rigTpl) {
        const gearEntries = database.bot.bots[role].gearEntries;
        const rig = await Item.get(rigTpl);
        if (gearEntries.bodyArmor.length > 0 && !rig._props.BlocksArmorVest) {
            const bodyArmorID = await getRandomFromArray(gearEntries.bodyArmor);
            const armorTemplate = await Item.get(bodyArmorID);
            const botBodyArmor = await armorTemplate.createAsNewItem();
            botBodyArmor.upd = await Item.createFreshBaseItemUpd(armorTemplate);    // TODO: variable durability
            botBodyArmor.slotId = "ArmorVest";
            botBodyArmor.parentId = parentId;
            return botBodyArmor;
        }
        logger.logError("[BotItemGeneration.generateBotGear.generateBotBodyArmor] Bot loadout doesn't have any available body armor.");
        return false;
    }

    /**
     * Determine if a bot will use a armoredVest or a vest, pick it and generate a new item.
     * @param {string} parentId equipment ID
     * @param {object} gearEntries allowed items for this role
     * @returns {Promise<object>} final item generated or false
     */
    static async generateBotRig(parentId, role) {
        const gearEntries = database.bot.bots[role].gearEntries;
        // pick the itemID to generate
        let rigID;
        let rigType;
        if (gearEntries.armoredVest.length > 0 && gearEntries.vest.length > 0) {
            if (await getRandomInt() > 25) {   // TODO: use a parameter in gameplay.json
                rigID = await getRandomFromArray(gearEntries.armoredVest);
                rigType = "ArmorVest";
            } else {
                rigID = await getRandomFromArray(gearEntries.vest);
                rigType = "TacticalVest";
            }
        } else if (gearEntries.armoredVest.length > 0) {
            rigID = await getRandomFromArray(gearEntries.armoredVest);
            rigType = "ArmorVest";
        } else if (gearEntries.vest.length > 0) {
            rigID = await getRandomFromArray(gearEntries.vest);
            rigType = "TacticalVest";
        } else {
            logger.logError("[BotItemGeneration.generateBotGear.generateBotRig] Bot loadout doesn't have any available vest and amored vest.");
            return false;
        }
        const rigTemplate = await Item.get(rigID);
        const botRig = await rigTemplate.createAsNewItem();
        if (rigType === "ArmorVest")
            botRig.upd = await Item.createFreshBaseItemUpd(rigTemplate);    // TODO: variable durability
        botRig.slotId = "TacticalVest";
        botRig.parentId = parentId;
        return botRig;
    }

    static async generateMagazinesInBotRig(rig, compatibleMagazines, compatibleAmmo) {
        let magToGenerate = false;
        const output = [];
        const generatedMags = [];
        const generatedAmmo = [];
        if (compatibleMagazines) {
            while (!magToGenerate) {
                const pickedMag = await getRandomFromArray(compatibleMagazines);
                const templateMag = await Item.get(pickedMag);
                const magSize = await templateMag.getSize();
                const freeSlot = await Item.getFreeSlot(rig, generatedMags, magSize.width, magSize.height);
                if (freeSlot) {
                    magToGenerate = templateMag;
                }
            }
            for (let i=0; i<3; i++) {
                const magSize = await magToGenerate.getSize();
                const freeSlot = await Item.getFreeSlot(rig, generatedMags, magSize.width, magSize.height);
                if (!freeSlot)
                    break;
                generatedMags.push(await BotItemGeneration.generateMagazine(rig._id, magToGenerate, freeSlot));
            }
            for (const mag of generatedMags) {
                const ammo = await getRandomFromArray(compatibleAmmo);
                generatedAmmo.push(await BotItemGeneration.generateAmmo(mag._id, ammo, mag._tpl));
            }
        }
        output.push(...generatedMags, ...generatedAmmo);
        return output;
    }

    static async generateBotPockets(parentId, role) {
        return {
            "_id": await generateMongoID(),
            "_tpl": await getRandomFromArray(database.bot.bots[role].authorizedGear.pocket),
            "parentId": parentId,
            "slotId": "Pockets"
        };
    }

    static async generateBotBackpack(parentId, role) {
        const gearEntries = database.bot.bots[role].gearEntries;
        // TODO: add parameter in gameplay.json for bot having backpack chances
        if (gearEntries.backpack.length > 0 && await getRandomInt() > 15) {
            const backpackTemplate = await Item.get(await getRandomFromArray(gearEntries.backpack));
            const backpack = await backpackTemplate.createAsNewItem();
            backpack.slotId = "Backpack";
            backpack.parentId = parentId;
            return backpack;
        }
        return false;
    }

    static async generateAmmo(parentId, ammo, magTpl=false) {
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
     * Generate a Boss secured container, add magazines and ammo inside.
     * @param {*} parentId
     * @param {*} cartridges
     * @returns
     */
    static async generateSecuredContainer(parentId, compatibleMagazines, ammoUsed) {
        return {
            "_id": await generateMongoID(),
            "_tpl": "5c0a794586f77461c458f892",
            "parentId": parentId,
            "slotId": "SecuredContainer"
        };
        /*const spareammo = [];
        for (const item of cartridges) {
            if (item.slotId !== "mod_magazine") continue;
            const cartridge = await Item.get(item._tpl);
            const type = await cartridge.getProperty("ReloadMagType", "ReloadMode"); //probably wont work but i will try
            if (type === "InternalMagazine") {
                let ammo = cartridges.find(c => c.slotId === "cartridges")._tpl;
                const data = await Item.get(ammo);

                for (let i = 0; i < 5; i++) {
                    ammo = await this.createAmmoStack(data, securecontainer._id);
                    spareammo.push(ammo);
                }

            } else if (type === "ExternalMagazine") {
                for (let i = 0; i < 5; i++) {

                    const magazine = await this.createCartridge(securecontainer._id, item);
                    const ammo = cartridges.find(c => c.slotId === "cartridges");
                    const loadMagazine = await this.generateLoadedCartridge(
                        ammo.upd.StackObjectsCount,
                        ammo._tpl,
                        magazine._id
                    );

                    spareammo.push(magazine, loadMagazine);
                }
            }
        }
        return [securecontainer, ...await this.generateItemsInContainer(spareammo, securecontainer)];*/
    }
}

class BotUtilities {

    /**
     * Create list of gears that can be picked randomly for each bot type
     * @param {*} role
     */
    static async generateGearEntries(role) {
        const botDatabase = database.bot.bots[role];
        if (!botDatabase.gearEntries) {
            botDatabase.gearEntries = {};
            if (botDatabase.weightedGear) {
                for (const gearCateg of botDatabase.weightedGear) {
                    const categorie = Object.keys(gearCateg)[0];
                    botDatabase.gearEntries[categorie] = [];
                    for (const item of gearCateg[categorie]) {
                        const itemId = Object.keys(item)[0];
                        for (let i=0; i < item[itemId]; i++)
                            botDatabase.gearEntries[categorie].push(itemId);
                    }
                }
            }
        }
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
            }
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

    /**static async generateParent(parent, parentId) {
        const output = {};
        const item = await Item.get(parent._tpl);
        parent._id = parentId;
        const durability = await generateRandomInt(item._props.durabSpawnMin, item._props.durabSpawnMax);
        const maxDurability = await generateRandomInt(durability, 100);

        const upd = {
            "Repairable": {
                "Durability": durability,
                "MaxDurability": maxDurability
            }
        };
        if (parent.upd) Object.assign(parent.upd, upd);
        else parent["upd"] = upd;

        output.push(parent);

        return output;
    }*/

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
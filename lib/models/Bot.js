const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { ItemNode } = require("./ItemNode");
const {
    generateMongoID,
    logger,
    generateRandomInt,
    writeFile,
    stringify,
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
            const {
                Role,
                Limit,
                Difficulty
            } = botParameter;

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

    async generateVoice(role = null) {
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

        if (role) {
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
                    if (role === "bossTagilla") logger.logError("The fuck are we doing here?????")
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
        const inventory = [];

        // independent slots //

        //const dogtag = await this.generateDogtag(parentId);
        //const armband = await this.generateArmband(parentId);
        const scabbard = await this.generateScabbard(parentId);

        // depends on a dynamic item generation function
        const pockets = await this.generatePockets(parentId, role); // createContainerMap()
        const head = await this.generateHeadAccessory(parentId, role);
        const body = await this.generateBodyAccessory(parentId, role);
        const securedContainer = await this.generateSecuredContainer(parentId, role);

        const weapons = await this.generateWeaponInSlot(parentId);

        inventory.push(...weapons, scabbard, securedContainer, pockets, ...head, ...body);
        return inventory;
    }

    async generateHeadAccessory(parentId, role = null) {
        const output = [];
        const conflicts = [];

        if (await getPercentRandomBool(25)) {
            const facecovers = await BotUtilities.generateLootBucket("FaceCover", role);
            const facecover = await getRandomFromArray(facecovers);
            if (facecover) {
                const check = await BotUtilities.checkForConflicts(facecover._id, conflicts)
                if (!check) {
                    if (facecover._props.ConflictingItems) conflicts.push(...facecover._props.ConflictingItems);
                    output.push(await this.generateFaceCover(parentId, facecover, role));
                }
            }
        }

        if (await getPercentRandomBool(25)) {
            const headphones = await BotUtilities.generateLootBucket("Earpiece", role);
            const earpiece = await getRandomFromArray(headphones);
            if (earpiece) {
                const check = await BotUtilities.checkForConflicts(earpiece._id, conflicts)
                if (!check) {
                    if (earpiece._props.ConflictingItems) conflicts.push(...earpiece._props.ConflictingItems);
                    output.push(await this.generateEarpiece(parentId, earpiece, role));
                }
            }
        }

        if (await getPercentRandomBool(25)) {
            const visors = await BotUtilities.generateLootBucket("Eyewear", role);
            const visor = await getRandomFromArray(visors);
            if (visor) {
                const check = await BotUtilities.checkForConflicts(visor._id, conflicts)
                if (!check) {
                    if (visor._props.ConflictingItems) conflicts.push(...visor._props.ConflictingItems);
                    output.push(await this.generateEyewear(parentId, visor, role));
                }
            }
        }

        if (await getPercentRandomBool(25)) {
            const headwears = await BotUtilities.generateLootBucket("Headwear", role);
            const headwear = await getRandomFromArray(headwears);
            if (headwear) {
                const check = await BotUtilities.checkForConflicts(headwear._id, conflicts)
                if (!check) {
                    if (headwear._props.ConflictingItems) conflicts.push(...headwear._props.ConflictingItems);
                    output.push(await this.generateHeadwear(parentId, headwear, role));
                }
            }
        }

        return output;
    }

    async generateHeadwear(parentId, headwear, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": headwear._id,
            "parentId": parentId,
            "slotId": "Headwear"
        };
    }

    async generateFaceCover(parentId, facecover, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": facecover._id,
            "parentId": parentId,
            "slotId": "FaceCover"
        };
    }

    async generateEarpiece(parentId, earpiece, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": earpiece._id,
            "parentId": parentId,
            "slotId": "Earpiece"
        };
    }

    async generateEyewear(parentId, visor, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": visor._id,
            "parentId": parentId,
            "slotId": "Eyewear"
        };
    }

    async generateBodyAccessory(parentId, role = null) {
        const output = [];
        const conflicts = [];


        const vests = await BotUtilities.generateLootBucket("TacticalVest", role);
        const vest = await getRandomFromArray(vests);

        if (vest._props.ConflictingItems) conflicts.push(...vest._props.ConflictingItems);
        output.push(await this.generateTacticalVest(parentId, vest, role));

        if (await getPercentRandomBool(25)) {
            const backpacks = await BotUtilities.generateLootBucket("Backpack", role);
            const backpack = await getRandomFromArray(backpacks);
            if (backpack) {
                const check = await BotUtilities.checkForConflicts(backpack._id, conflicts)
                if (!check &&
                    backpack._props.BlocksArmorVest === false) {

                    if (backpack._props.ConflictingItems) conflicts.push(...backpack._props.ConflictingItems);
                    output.push(await this.generateBackpack(parentId, backpack, role));
                }
            }
        }

        if (await getPercentRandomBool(25)) {
            const armor = await BotUtilities.generateLootBucket("ArmorVest", role)
            const armorvest = await getRandomFromArray(armor);
            if (armorvest) {
                const check = await BotUtilities.checkForConflicts(armorvest._id, conflicts)
                if (!check &&
                    vest._props.BlocksArmorVest === false) {

                    if (armorvest._props.ConflictingItems) conflicts.push(...armorvest._props.ConflictingItems);
                    output.push(await this.generateArmorVest(parentId, armorvest, role));
                }
            }
        }

        // then add items to the tactical vest (later)
        output.push()
        return output;
    }

    async generateTacticalVest(parentId, vest, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": vest._id,
            "parentId": parentId,
            "slotId": "TacticalVest"
        };
    }

    async generateArmorVest(parentId, armorvest, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": armorvest._id,
            "parentId": parentId,
            "slotId": "ArmorVest",
            "upd": {
                "Repairable": {
                    "Durability": await getRandomInt(
                        35,
                        armorvest._props.MaxDurability
                    )
                }
            }
        };
    }

    async generateBackpack(parentId, backpack, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": backpack._id,
            "parentId": parentId,
            "slotId": "Backpack"
        };
    }

    async generatePockets(parentId, role = null) {
        // need to create dynamic item selection function
        const pockets = [
            "60c7272c204bc17802313365", //1x3x4
            "5af99e9186f7747c447120b8", //1x2x4
            "557ffd194bdc2d28148b457f" //1x1x4
        ];
        return {
            "_id": await generateMongoID(),
            "_tpl": await getRandomFromArray(pockets),
            "parentId": parentId,
            "slotId": "Pockets"
        };

        /**
         * Pockets have slots... need to check the Slots on the Pocket ID
         * Create slots based on 1-howevermany and give them the proper slotId
         * "pocket1-howevermany"
         * with location x0 y0 r0
         * then map out the slots of those pockets and map items to them
         */
    }

    async generateScabbard(parentId, role = null) {
        const lootbucket = await BotUtilities.generateLootBucket("Scabbard", role);
        const scabbard = await getRandomFromArray(lootbucket);

        return {
            "_id": await generateMongoID(),
            "_tpl": scabbard._id,
            "parentId": parentId,
            "slotId": "Scabbard"
        };
    }

    async generateSecuredContainer(parentId, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": "5c0a794586f77461c458f892",
            "parentId": parentId,
            "slotId": "SecuredContainer"
        }
    }

    async generateWeaponInSlot(parentId, slot = null) {

        const newId = await generateMongoID();
        const test = await BotUtilities.testFirstPrimaryWeapon();
        const weapon = await BotUtilities.generateChildren(
            test[0],
            test,
            newId
        );
        test[0]._id = newId;
        test[0].parentId = parentId;
        weapon.unshift(test[0]);

        // get ammo for the weapon
        const data = await BotUtilities.getChambers(test[0]._tpl)
        const ammo = await getRandomFromArray(data[0].ammo);
        const chamberWeapon = await this.generatePatronInWeapon(test[0], ammo)
        const insertMagazine = await this.generateMagazine(test[0], ammo)
        weapon.push(...insertMagazine, chamberWeapon);


        return weapon;
    }

    async generatePatronInWeapon(weapon, ammo) {
        return {
            "_id": await generateMongoID(),
            "_tpl": ammo,
            "parentId": weapon._id,
            "slotId": "patron_in_weapon",
            "upd": {
                "StackObjectsCount": 1
            }
        }
    }

    async generateMagazine(gun, ammo, role = null) {
        const loadedMagazine = [];

        const magazines = await BotUtilities.getFilter(gun._tpl, "mod_magazine");
        // need to create lootbucket for magazines
        const magazine = await getRandomFromArray(magazines);
        const mag = {
            "_id": await generateMongoID(),
            "_tpl": magazine,
            "parentId": gun._id,
            "slotId": "mod_magazine"
        };

        const data = await BotUtilities.generateCartridgeData(magazine);
        const loadMagazine = await this.generateLoadedMagazine(data[0], ammo, mag._id);

        loadedMagazine.push(mag, loadMagazine);
        return loadedMagazine;
    }

    async generateLoadedMagazine(data, ammo, parentId) {
        return {
            "_id": await generateMongoID(),
            "_tpl": ammo,
            "parentId": parentId,
            "slotId": "cartridges",
            "upd": {
                "StackObjectsCount": data.count
            }
        }
    }

}

class BotUtilities {
    /**
     * Get filter of item based on Slots._name or Slots._id
     * using the _tpl or _id of the item
     * @param {*} item 
     * @param {*} slotId 
     * @returns 
     */
    static async getFilter(item, slotId) {
        if (!item._id) item = await Item.get(item);
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
        if (!item._id) item = await Item.get(item);
        if (item._props.Chambers) {
            for (const chamber of item._props.Chambers) {
                for (const ammo of chamber._props.filters) {
                    if (ammo.Filter) {
                        const data = {
                            "name": chamber._name,
                            "ammo": ammo.Filter
                        }
                        output.push(data);
                    }
                }
            }
        }
        return output;
    }

    static async generateCartridgeData(item) {
        const output = [];
        if (!item._id) item = await Item.get(item);
        if (item._props.Slots) {
            if (item._props.Cartridges) {
                for (const cartridge of item._props.Cartridges) {
                    const data = {
                        "_name": cartridge._name,
                        "count": cartridge._max_count
                    };
                    output.push(data);
                }
            }
        }
        return output;
    }

    static async generateParent(parent, parentId) {
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

        if (item._props.Chambers[0]._name === "patron_in_weapon") {
            const patron = {
                "_id": await generateMongoID(),
                "_tpl": "59e6542b86f77411dc52a77a",
                "parentId": "627b87e7ce4c2a1cb10b3597",
                "slotId": "patron_in_weapon",
                "upd": {
                    "StackObjectsCount": 1
                }
            };
        }

        output.push(parent);

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

    static async testFirstPrimaryWeapon() {
        return [
            {
                "_id": "627b87e6ce4c2a1cb10b2f26",
                "_tpl": "576165642459773c7a400233",
                "parentId": "627b87e6ce4c2a1cb10b2f20",
                "slotId": "FirstPrimaryWeapon",
                "upd": {
                    "Repairable": {
                        "Durability": 54,
                        "MaxDurability": 56
                    }
                }
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f27",
                "_tpl": "576169e62459773c69055191",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_handguard"
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f28",
                "_tpl": "5649ade84bdc2d1b2b8b4587",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_pistol_grip"
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f2a",
                "_tpl": "57616c112459773cce774d66",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_reciever"
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f2b",
                "_tpl": "57a9b9ce2459770ee926038d",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_sight_rear"
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f2c",
                "_tpl": "57616ca52459773c69055192",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_stock"
            }
            /*,
             {
                "_id": "627b87e6ce4c2a1cb10b2f2d",
                "_tpl": "57616a9e2459773c7a400234",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_magazine"
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f2e",
                "_tpl": "5d6e68b3a4b9361bca7e50b5",
                "parentId": "627b87e6ce4c2a1cb10b2f2d",
                "slotId": "cartridges",
                "upd": {
                    "StackObjectsCount": 5
                }
            },
            {
                "_id": "627b87e6ce4c2a1cb10b2f2f",
                "_tpl": "5d6e68b3a4b9361bca7e50b5",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "patron_in_weapon",
                "upd": {
                    "StackObjectsCount": 1
                }
            } 
            */
        ];
    }

    /**
     * Generate loot pool based on rarity, and item type based on Default Inventory
     * @param {*} itemType 
     * @param {*} role 
     * @returns 
     */
    static async generateLootBucket(itemType, role) {
        const data = database.core.rarity
        const chances = data.Chance.Global; //default chances until roles are implemented
        const item = data[itemType]
        const lootbucket = [];

        for (const chance in chances) {
            if (!item[chance] === 0) continue;
            if (await getPercentRandomBool(chances[chance])) {
                lootbucket.push(...item[chance]);
            }
        }
        return BotUtilities.generateAllowedItems(lootbucket, itemType);
    }

    static async checkForConflicts(item, filter) {
        for (const conflict of filter) {
            if (item === conflict) {
                return true;
            }
        } return false;
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
                                filtered.push(item);
                            }
                        }
                    }
                }
                if (item._id === filter) {
                    filtered.push(item);
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

const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { generateMongoID, logger, generateRandomInt, writeFile,
    stringify, findChildren, getRandomFromArray, getPercentRandomBool,
    getRandomInt } = require("../../utilities");
const { database } = require("../../app");
const { ItemNode } = require("./ItemNode");
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
            const { Role, Limit, Difficulty } = botParameter;

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

        if (role == "pmcBot") logger.logDebug(`[Bot : generateInfo] Role [${role}] needs to be side-switched`);

        templateInfo.Nickname = await this.generateNickname(role);
        templateInfo.Side = "Savage";
        templateInfo.Voice = await this.generateVoice(role)
        templateInfo.Settings = await this.generateSettings(templateInfo.Settings, role, difficulty);

        await this.setInfo(templateInfo);
    }

    async generateNickname(role) {

        if (["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"].includes(role)) {
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
                return BotUtilities.randomProperty(database.bot.appearance[role].Voice);
            } else return database.bot.appearance[role].Voice;
        } else if (role && ["assault", "cursedAssault", "marksman"].includes(role)) {
            return BotUtilities.randomProperty(database.bot.appearance.scav.Voice);
        } else if (role && ["followerGluharSecurity", "followerGluharAssault", "followerGluharScout"].includes(role)) {
            return BotUtilities.randomProperty(database.bot.appearance.followerGluhar.Voice);
        } else {
            logger.logError(`[Bot : generateInfo] Role [${role}] appearance not handled`);
            return BotUtilities.randomProperty(database.bot.appearance.random.Voice);
        }
    }

    async generateSettings(settings, role, difficulty) {
        settings.Role = role;
        settings.BotDifficulty = difficulty;

        if (["assault", "cursedAssault", "marksman"].includes(role)) {
            settings.StandingForKill = -0.02;
            settings.AggressorBonus = 0.01;
        }
        else if ([
            "bossTest", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper",
            "followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            settings.StandingForKill = -0.05;
            settings.AggressorBonus = 0.02;
        }
        else if ([
            "bossBully", "bossSanitar", "bossKilla",
            "bossGluhar", "bossKojaniy", "bossTagilla", "followerKilla"].includes(role)) {

            settings.StandingForKill = -0.2;
            settings.AggressorBonus = 0.05;
        }
        else if ([
            "followerBirdEye", "followerBigPipe", "exUsec", "bossKnight",
            "sectantWarrior", "sectantPriest", "followerTest",
            "followerTagilla", "pmcBot", "followerGluharSnipe"].includes(role)) {

            settings.StandingForKill = 0;
            settings.AggressorBonus = 0;
        }
        else if (["usec", "bear"].includes(role)) {
            settings.StandingForKill = 0.01;
            settings.AggressorBonus = 0.02;
        }
        else if (role === "gifter") {
            settings.StandingForKill = -0.3;
            settings.AggressorBonus = 0.15;
        }
        else {
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
            "bossSanitar", "bossKnight", "bossGluhar", "bossBully"].includes(role)) return 1000;

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
        let health = this.template.Health;
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
        let templateItems = templateInventory.items;

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
        const botDefaultInventory = await this.generateInventoryItems(templateInventory.equipment, role);
        templateItems.push(...botDefaultInventory);

        // initiate conquer
        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(parentId, role) {
        const finalResult = [];

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

        finalResult.push(...weapons, scabbard, securedContainer, pockets, ...head, ...body);
        return finalResult;

    }

    async generateHeadAccessory(parentId, role = null) {
        const output = [];
        const conflicts = [];

        if (await getPercentRandomBool(25)) {
            const visors = await ItemNode.getNodeChildrenByName("Visors");
            const visor = await getRandomFromArray(visors);

            if (!conflicts.includes(visor._id)) {
                conflicts.push(...visor._props.ConflictingItems);
                output.push(await this.generateEyewear(parentId, visor, role));
            }
        }

        if (await getPercentRandomBool(25)) {
            const facecovers = await ItemNode.getNodeChildrenByName("FaceCover");
            const facecover = await getRandomFromArray(facecovers);

            if (!conflicts.includes(facecover._id)) {
                conflicts.push(...facecover._props.ConflictingItems);
                output.push(await this.generateFaceCover(parentId, facecover, role));
            }
        }

        if (await getPercentRandomBool(25)) {
            const headphones = await ItemNode.getNodeChildrenByName("Headphones");
            const earpiece = await getRandomFromArray(headphones);

            if (!conflicts.includes(earpiece._id)) {
                conflicts.push(...earpiece._props.ConflictingItems);
                output.push(await this.generateEarpiece(parentId, earpiece, role));
            }
        }

        if (await getPercentRandomBool(25)) {
            const headwears = await ItemNode.getNodeChildrenByName("Headwear");
            const headwear = await getRandomFromArray(headwears);

            if (!conflicts.includes(headwear._id)) {
                conflicts.push(...headwear._props.ConflictingItems);
                output.push(await this.generateHeadwear(parentId, headwear, role));
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
        }
    }

    async generateFaceCover(parentId, facecover, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": facecover._id,
            "parentId": parentId,
            "slotId": "FaceCover"
        }
    }

    async generateEarpiece(parentId, earpiece, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": earpiece._id,
            "parentId": parentId,
            "slotId": "Earpiece"
        }
    }

    async generateEyewear(parentId, visor, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": visor._id,
            "parentId": parentId,
            "slotId": "Eyewear"
        }
    }

    async generateBodyAccessory(parentId, role = null) {
        const output = [];
        const conflicts = [];

        const vests = await ItemNode.getNodeChildrenByName("Vest");
        const vest = await getRandomFromArray(vests);
        conflicts.push(...vest._props.ConflictingItems);
        output.push(await this.generateTacticalVest(parentId, vest, role));

        if (await getPercentRandomBool(25)) {
            const backpacks = await ItemNode.getNodeChildrenByName("Backpack");
            const backpack = await getRandomFromArray(backpacks);

            if (!conflicts.includes(backpack._id) &&
                backpack._props.BlocksArmorVest === false) {

                conflicts.push(...backpack._props.ConflictingItems);
                output.push(await this.generateBackpack(parentId, backpack, role));
            }
        }

        if (await getPercentRandomBool(25)) {
            const armorvest = await getRandomFromArray(
                await ItemNode.getNodeChildrenByName("Armor")
            );

            if (!conflicts.includes(armorvest._id) &&
                vest._props.BlocksArmorVest === false) {
                    
                conflicts.push(...armorvest._props.ConflictingItems);
                output.push(await this.generateArmorVest(parentId, armorvest, role));
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
        }
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
        }
    }

    async generateBackpack(parentId, backpack, role = null) {
        return {
            "_id": await generateMongoID(),
            "_tpl": backpack._id,
            "parentId": parentId,
            "slotId": "Backpack"
        }
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
        }

        /**
         * Pockets have slots... need to check the Slots on the Pocket ID
         * Create slots based on 1-howevermany and give them the proper slotId
         * "pocket1-howevermany"
         * with location x0 y0 r0
         * then map out the slots of those pockets and map items to them
         */
    }

    async generateScabbard(parentId, role = null) {
        const scabbard = await getRandomFromArray(
            await ItemNode.getNodeChildrenByName("Knife")
        );
        return {
            "_id": await generateMongoID(),
            "_tpl": scabbard._id,
            "parentId": parentId,
            "slotId": "Scabbard"
        }
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
        let weapon = await this.generateChildren(
            test[0],
            test,
            newId
        )
        test[0]._id = newId;
        test[0].parentId = parentId;
        weapon.unshift(test[0]);


        return weapon;
    }

    async generateParent(parent, parentId) {
        const output = {}
        const item = await Item.get(parent._tpl)
        parent._id = parentId;
        const durability = await generateRandomInt(item._props.durabSpawnMin, item._props.durabSpawnMax);
        const maxDurability = await generateRandomInt(durability, 100);

        const upd = {
            "Repairable": {
                "Durability": durability,
                "MaxDurability": maxDurability
            }
        }
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
            }
        }

        output.push(parent);

        return output;
    }

    async generateMagazinesAndAmmo() { return "your mom gay" }

    async generateChildren(parent, children, newId) {
        const output = [];
        for (const child of children) {

            if (child.parentId == parent._id) {
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

    async getSlotDependencies(slotId) { return "your mom gay" }

    async generateSlotDependencies(child) { return "your mom gay" }

}

class BotUtilities {

    static async randomProperty(obj) {
        const keys = Object.keys(obj);
        return obj[keys[keys.length * Math.random() << 0]]
    }
    /**
     * Generates test data for the first primary weapon
     * @returns 
     */
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
                "_id": "627b87e6ce4c2a1cb10b2f29",
                "_tpl": "57acb6222459771ec34b5cb0",
                "parentId": "627b87e6ce4c2a1cb10b2f26",
                "slotId": "mod_mount_000"
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
            },
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
        ];
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;

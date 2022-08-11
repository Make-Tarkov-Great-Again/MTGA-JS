const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { generateMongoID, logger, generateRandomInt, writeFile, stringify } = require("../../utilities");
const { database } = require("../../app");
const cloneDeep = require("rfdc")()



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
        //const dummyRequest = require("../../dummyBotRequest.json"); //for testing purposes
        //const botsParameters = dummyRequest.conditions;
        const botsParameters = request.body.conditions;
        console.log(botsParameters);
        // I don't know the return value yet, it's just to keep them somewhere for testing purposes
        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const { Role, Limit, Difficulty } = botParameter;

            for (let i = 0; i < Limit - 1; i++) {
                const newBot = new Bot();

                await Promise.all([
                    newBot.setIds(await generateMongoID(), i),
                    newBot.generateInfo(Role, Difficulty),
                    newBot.generateCustomization(Role),
                    newBot.generateHealth(Role, Difficulty),
                    newBot.generateInventory(Role),
                ]);

                generatedBots.push(newBot.template);
            }
        }
        return generatedBots;
    }

    async setIds(id, aid) {
        this.template._id = id;
        this.template.aid = aid;
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
        // this function generateInfo, that mean name, role, side etc...
        const templateInfo = this.template.Info;
        // this part generate name, it's a sub function that can be extracted
        templateInfo.Nickname = await this.generateNickname(role);
        templateInfo.Side = "Savage";

        let appearance = database.bot.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (database.bot.bots[role].appearance) {
                appearance = database.bot.bots[role].appearance;
            }
            logger.logError(`[Bot : generateInfo] Role [${role}] appearance not handled`);
            templateInfo.Voice = await BotUtilities.randomProperty(appearance.Voice);
        }

        templateInfo.Settings = await this.generateSettings(templateInfo.Settings, role, difficulty);
        // set role, difficulty, then figure out how to generate the rest

        await this.setInfo(templateInfo);
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
        else if (["usec", "bear"].includes(role)) return await generateRandomInt(250, 1000);
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

    async generateNickname(role) {

        if (["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"].includes(role)) {
            return database.bot.names.generalFollower[await generateRandomInt(0, database.bot.names.generalFollower.length - 1)];
        } else if (["marksman", "cursedAssault", "playerscav", "assault"].includes(role)) {
            return database.bot.names.scav[await generateRandomInt(0, database.bot.names.scav.length - 1)];
        } else if (["followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            return database.bot.names[role][await generateRandomInt(0, database.bot.names[role].length - 1)];
        } else if (["usec", "bear"].includes(role)) {
            return database.bot.names.normal[await generateRandomInt(0, database.bot.names.normal.length - 1)];
        } else {
            if (database.bot.names[role]) {
                return database.bot.names[role][0];
            }
            logger.logError(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.logError(`Add ${role} to botNames in database/bots and adjust function`);
            return database.bot.names.scav[await generateRandomInt(0, database.bot.names.scav.length - 1)];
        }
    }

    async generateCustomization(role) {
        const templateCustomization = this.template.Customization;

        /**
         * Randomness will be temporary
         */
        let appearance = database.bot.appearance.random;
        if (typeof database.bot.bots != "undefined") { // if role is given, use it to generate appearance
            if (typeof database.bot.bots[role] != "undefined" && typeof database.bot.bots[role].appearance != "undefined") {
                appearance = database.bot.bots[role].appearance;
            }
            logger.logError(`[Bot : generateCustomization] Role [${role}] appearance not handled`);
        }

        const head = await generateRandomInt(0, appearance.Head.length - 1);
        templateCustomization.Head = appearance.Head[head];
        if (typeof templateCustomization.Head === "undefined") {
            console.log("[HEAD]: ", head);
            templateCustomization.Head = "5cc2e4d014c02e000d0115f8";
        }

        const body = await generateRandomInt(0, appearance.Body.length - 1);
        templateCustomization.Body = appearance.Body[body];
        if (typeof templateCustomization.Body === "undefined") {
            console.log("[BODY]: ", body);
            templateCustomization.Body = "5d28ad7286f7742926686182";
        }
        const feet = await generateRandomInt(0, appearance.Feet.length - 1);
        templateCustomization.Feet = appearance.Feet[feet];
        if (typeof templateCustomization.Feet == "undefined") {
            console.log("[FEET]: ", feet);
            templateCustomization.Feet = "5f5e41576760b4138443b344";
        }

        const hands = await generateRandomInt(0, appearance.Hands.length - 1);
        templateCustomization.Hands = appearance.Hands[hands];
        if (typeof templateCustomization.Hands === "undefined") {
            console.log("[HANDS]: ", hands);
            templateCustomization.Hands = "5cc2e68f14c02e28b47de290";
        }

        if (templateCustomization.Body === "609e86926e8078716f600883") {
            /**
             * Tagilla doesn't have a separate head texture, he uses No_Mesh
             * head texture is in the body texture, so we need to default
             */
            templateCustomization.Head = "5d5f8ba486f77431254e7fd2";
        }

        // do gen
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

        return this.setHealth(health)
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
        const botDefaultInventory = await this.generateInventoryItems(templateItems.shift(), role)
        templateItems.push(...botDefaultInventory);

        // initiate conquer
        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(inventory, role) {
        const parentId = inventory._id;
        const finalResult = [];
        const pockets = await this.generatePockets(parentId, role); // createContainerMap()
        const weapons = await this.generateWeaponInSlot(parentId);


        // independent slots //

        //const dogtag = await this.generateDogtag(parentId);
        //const armband = await this.generateArmband(parentId);
        const scabbard = await this.generateScabbard(parentId);

        // depends on a dynamic item generation function

        //const head = await this.generateHeadAccessory(parentId, role);
        //const body = await this.generateBodyAccessory(parentId, role);
        //const backpack = await this.generateBackpack(parentId, role);
        const securedContainer = await this.generateSecuredContainer(parentId, role);

        //const weapons = await this.generateWeaponInSlot(parentId);

        finalResult.push(...weapons, pockets, scabbard, securedContainer, inventory);
        return finalResult;

    }

    async generateHeadAccessory(parentId, role) {
        //await this.generateHeadwear(parentId, role),
        //await this.generateFaceCover(parentId, role),
        //await this.generateEarpiece(parentId, role),
        //await this.generateEyewear(parentId, role),
    }

    async generateBodyAccessory(parentId, role) {
        //await this.generateArmorVest(parentId, role), // createContainerMap() //
        //await this.generateTacticalVest(parentId, role), // createContainerMap() //
    }

    async generatePockets(parentId, role) {
        // need to create dynamic item selection function
        const pockets = [
            "60c7272c204bc17802313365", //1x3x4
            "5af99e9186f7747c447120b8", //1x2x4
            "557ffd194bdc2d28148b457f", //1x1x4 
        ];
        return {
            "_id": await generateMongoID(),
            "_tpl": pockets[await generateRandomInt(0, pockets.length)],
            "parentId": parentId,
            "slotId": "Pockets"
        }
        /*
        if (role === "bossTagilla") pocketScheme({
            _id: await generateMongoID(),
            _tpl: "60c7272c204bc17802313365",
            parentId: parentId,
            slotId: "Pockets"
        }) 
        */
    }

    async generateScabbard(parentId) {
        return {
            "_id": await generateMongoID(),
            "_tpl": "57e26fc7245977162a14b800",
            "parentId": parentId,
            "slotId": "Scabbard"
        }
    }

    async generateSecuredContainer(parentId, role) {
        return {
            "_id": await generateMongoID(),
            "_tpl": "5c0a794586f77461c458f892",
            "parentId": parentId,
            "slotId": "SecuredContainer"
        }
    }

    async generateWeaponInSlot(parentId, slot = null) {
        /*
                const flag = await generateRandomInt(0, 1);
                if (flag === 0 && slot !== "FirstPrimaryWeapon") return;
                const presets = await Preset.getAllWithoutKeys();
        
                let preset = presets[await generateRandomInt(0, presets.length)];
                if (Object.keys(preset).length > 1) {
                    preset = await this.randomProperty(preset)
                } else preset = preset[Object.keys(preset)];
        
                let weapon = await this.generateChildren(
                    preset._items[0],
                    preset._items,
                    parentId
                )
                weapon.unshift(await this.generateParent(preset._items[0], parentId));
         */
        const test = await BotUtilities.testFirstPrimaryWeapon();
        let weapon = await this.generateChildren(
            test[0],
            test
        )
        test[0]._id = await generateMongoID();
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

    async generateChildren(parent, children) {
        const input = [];
        for (const child of children) {
            if (child.parentId === parent._id) {

                const grandchildren = await this.generateChildren(child, children);

                const newChild = cloneDeep(child);
                newChild._id = await generateMongoID();
                newChild.parentId = parent._id;
                input.push(newChild);

                if (grandchildren) {
                    for (const grandchild of grandchildren) {
                        grandchild._id = await generateMongoID();
                        grandchild.parentId = newChild._id;
                        input.push(grandchild);
                    }
                }
            }
        }

        if (input.length > 0) {
            return input;
        }
        return false;
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

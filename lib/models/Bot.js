const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { generateMongoID, logger, generateRandomInt, writeFile, stringify } = require("../../utilities");
const { database } = require("../../app");
const fastJson = require("fast-json-stringify");


class Bot extends BaseModel {
    constructor() {
        super();
        this.template = database.core.botTemplate;
    }

    /**
     * Generate a list of bot corresponding to the give conditions in request
     * @param {Request} request
     * @param {Reply} reply
     */
    static async generateBots(request = null, reply = null) {
        const dummyRequest = require("../../dummyBotRequest.json"); //for testing purposes
        const botsParameters = dummyRequest.conditions;
        //let aid = 0;
        // I don't know the return value yet, it's just to keep them somewhere for testing purposes
        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const { Role, Limit, Difficulty } = botParameter;

            for (let i = 0; i < Limit ; i++) {
                const newBot = new Bot()

                await Promise.all([
                    newBot.setIds(await generateMongoID(), i),
                    newBot.generateInfo(Role, Difficulty),
                    newBot.generateCustomization(Role),
                    newBot.generateHealth(Role, Difficulty),
                    newBot.generateInventory(Role),
                ]);
                generatedBots.push(newBot);
            }
        }
        writeFile("./generatedBots.json", stringify(generatedBots));
    }

    async setIds(id, aid) {
        this._id = id;
        this.aid = aid;
    }

    async setInfo(newInfo) {
        this.Info = newInfo;
    }

    async setCustomization(newCustomization) {
        this.Customization = newCustomization;
    }

    async setHealth(newHealth) {
        this.Health = newHealth;
    }

    async setInventory(newInventory) {
        this.Inventory = newInventory;
    }

    async generateInfo(role, difficulty) {
        // this function generateInfo, that mean name, role, side etc...
        const templateInfo = this.template.Info;
        // this part generate name, it's a sub function that can be extracted
        templateInfo.Nickname = await this.generateNickname(role);

        let appearance = database.bot.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (database.bot.bots[role].appearance) {
                appearance = database.bot.bots[role].appearance;
            }
            logger.logError(`[Bot : generateCustomization] Role [${role}] appearance not handled`);
            templateInfo.Voice = appearance.Voice[await generateRandomInt(0, appearance.Voice.length)];
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
            return database.bot.names.generalFollower[await generateRandomInt(0, database.bot.names.generalFollower.length)];
        } else if (["marksman", "cursedAssault", "playerscav", "assault"].includes(role)) {
            return database.bot.names.scav[await generateRandomInt(0, database.bot.names.scav.length)];
        } else if (["followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            return database.bot.names[role][await generateRandomInt(0, database.bot.names[role].length)];
        } else if (["usec", "bear"].includes(role)) {
            return database.bot.names.normal[await generateRandomInt(0, database.bot.names.normal.length)];
        } else {
            if (database.bot.names[role]) {
                return database.bot.names[role][0];
            }
            logger.logError(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.logError(`Add ${role} to botNames in database/bots and adjust function`);
            return database.bot.names.scav[await generateRandomInt(0, database.bot.names.scav.length)];
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

        templateCustomization.Body = appearance.Body[await generateRandomInt(0, appearance.Body.length)];
        templateCustomization.Head = appearance.Head[await generateRandomInt(0, appearance.Head.length)];
        if (templateCustomization.Body === "609e86926e8078716f600883") {
            /**
             * Tagilla doesn't have a separate head texture, he uses No_Mesh
             * head texture is in the body texture, so we need to default
             */
            templateCustomization.Head = "5d5f8ba486f77431254e7fd2";
        }
        templateCustomization.Feet = appearance.Feet[await generateRandomInt(0, appearance.Feet.length)];
        templateCustomization.Hands = appearance.Hands[await generateRandomInt(0, appearance.Hands.length)];

        // do gen
        await this.setCustomization(templateCustomization);
    }

    async generateHealth(role, difficulty) {
        if (database.bot.bots[role].health && Object.keys(database.bot.bots[role].health).length > 1) {
            return this.setHealth(database.bot.bots[role].health[difficulty]);
        } else if (database.bot.bots[role].health) {
            return this.setHealth(database.bot.bots[role].health);
        } else {
            logger.logError(`[Bot : generateHealth] Role [${role}] health not handled`);
            return this.setHealth(database.bot.bots["assault"].health["impossible"]);
        }
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
        templateItems.unshift(botDefaultInventory);

        // initiate conquer
        await this.setInventory(templateInventory);
    }

    async generateInventoryItems(inventory, role) {
        const parentId = inventory._id;
        return [
            inventory,
            // independent slots //
            //await this.generateDogtag(parentId),
            //await this.genereateArmBand(parentId),
            //await this.generateScabbard(parentId),

            // depends on a dynamic item generation function

            //await generateHeadAccessory(parentId, role),
            //await generateBodyAccessory(parentId, role),

            await this.generatePockets(parentId, role), // createContainerMap()
            //await this.generateBackpack(parentId), // createContainerMap()
            //await this.generateSecuredContainer(parentId), // Item.getSize()

            // depends on the tactical vest and pockets
            await this.generateWeaponInSlot(parentId),
            //await this.generateWeaponInSlot(parentId, "FirstPrimaryWeapon"),
            //await this.generateWeaponInSlot(parentId, "Holster"),
            //await this.generateWeaponInSlot(parentId, "SecondPrimaryWeapon"),
        ]
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

        const pocketScheme = fastJson({
            type: "object",
            properties: {
                "_id": {
                    type: "string"
                },
                "_tpl": {
                    type: "string"
                },
                "parentId": {
                    type: "string"
                },
                "slotId": {
                    type: "string"
                }
            }
        });

        return pocketScheme({
            _id: await generateMongoID(),
            _tpl: pockets[await generateRandomInt(0, pockets.length)],
            parentId: parentId,
            slotId: "Pockets"
        })

        if (role === "bossTagilla") pocketScheme({
            _id: await generateMongoID(),
            _tpl: "60c7272c204bc17802313365",
            parentId: parentId,
            slotId: "Pockets"
        })
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
            test,
            parentId
        )
        test[0].parentId = parentId;
        //weapon.unshift(await this.generateParent(test[0], parentId));
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

    async generateChildren(parent, children, parentId) {
        const output = [];
        for (const child of children) {
            if (child.parentId === parent._id) {
                const grandchildren = await this.generateChildren(
                    child,
                    children,
                    child._id
                );
                const newChild = {
                    _id: await generateMongoID(),
                    _tpl: child._tpl,
                    parentId: parentId,
                    slotId: child.slotId,
                }

                if (grandchildren) {
                    newChild.children = grandchildren;
                }
                output.push(newChild);
            }
        }

        if (output.length > 0) {
            return output;
        }
        return false;
    }

    async getSlotDependencies(slotId) {
        if (slotId === ("mod_magazine")) {
            return true;
        }
        return false;
    }
    async generateSlotDependencies(child) {
        if (slotId === "mod_magazine") {
            return "mod_magazine";
        }
        return slotId;
    }

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
                "_id": "627b87e9ce4c2a1cb10b6204",
                "_tpl": "5ac66d9b5acfc4001633997a",
                "parentId": "627b87e9ce4c2a1cb10b61fe",
                "slotId": "FirstPrimaryWeapon",
                "upd": {
                    "Repairable": {
                        "Durability": 89,
                        "MaxDurability": 99
                    }
                }
            },
            {
                "_id": "627b87e9ce4c2a1cb10b6205",
                "_tpl": "59c6633186f7740cf0493bb9",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_gas_block"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b6206",
                "_tpl": "5648b1504bdc2d9d488b4584",
                "parentId": "627b87e9ce4c2a1cb10b6205",
                "slotId": "mod_handguard"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b6208",
                "_tpl": "5649ade84bdc2d1b2b8b4587",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_pistol_grip"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b6209",
                "_tpl": "5ac50da15acfc4001718d287",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_reciever"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b620a",
                "_tpl": "5ac733a45acfc400192630e2",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_sight_rear"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b620b",
                "_tpl": "5ac50c185acfc400163398d4",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_stock"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b620d",
                "_tpl": "593d493f86f7745e6b2ceb22",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_muzzle"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b620e",
                "_tpl": "5cbdaf89ae9215000e5b9c94",
                "parentId": "627b87e9ce4c2a1cb10b6204",
                "slotId": "mod_magazine"
            },
            {
                "_id": "627b87e9ce4c2a1cb10b620f",
                "_tpl": "56dfef82d2720bbd668b4567",
                "parentId": "627b87e9ce4c2a1cb10b620e",
                "slotId": "cartridges",
                "upd": {
                    "StackObjectsCount": 30
                }
            }
        ]
    }
}

module.exports.Bot = Bot;
module.exports.BotUtilities = BotUtilities;

const { BaseModel } = require("./BaseModel");
const { Preset } = require("./Preset");
const { Item } = require("./Item");
const { generateMongoID, logger, generateRandomInt, writeFile } = require("../../utilities");
const { database } = require("../../app");


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

            for (let i = 0; i < Limit; i++) {
                const newBot = new Bot();

                await Promise.all([
                    newBot.setIds(await generateMongoID(), i),
                    newBot.generateInfo(Role, Difficulty),
                    newBot.generateCustomization(Role),
                    newBot.generateHealth(Role),
                    newBot.generateInventory(Role),
                ]);
            }
        }
        writeFile("../../generatedBots.json", stringify(generatedBots));
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
        // other info related generation
        templateInfo.Role = role;

        let appearance = database.bots.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (typeof database.bots.appearance[role] != "undefined") {
                appearance = database.bots.appearance[role];
            }
            logger.logError(`[Bot : generateCustomization] Role [${role}] appearance not handled`);
            templateInfo.Voice = appearance.Voice[await generateRandomInt(0, appearance.Voice.length)];
        }

        this.setInfo(templateInfo);
    }

    async generateNickname(role) {

        if (["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"].includes(role)) {
            return database.bots.names.followergluhar[await generateRandomInt(0, database.bots.names.followergluhar.length)];
        } else if (["marksman", "cursedAssault", "playerscav", "assault"].includes(role)) {
            return database.bots.names.scav[await generateRandomInt(0, database.bots.names.scav.length)];
        } else if (["followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            return database.bots.names[role][await generateRandomInt(0, database.bots.names[role].length)];
        } else if (["usec", "bear"].includes(role)) {
            return database.bots.names.normal[await generateRandomInt(0, database.bots.names.normal.length)];
        } else {
            if (database.bots.names[role]) {
                return database.bots.names[role][0];
            }
            logger.logError(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.logError(`Add ${role} to botNames in database/bots and adjust function`);
            return database.bots.names.scav[await generateRandomInt(0, database.bots.names.scav.length)];
        }
    }

    async generateCustomization(role) {
        const templateCustomization = this.template.Customization;

        let appearance = database.bots.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (typeof database.bots.appearance[role] != "undefined") {
                appearance = database.bots.appearance[role];
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
        this.setCustomization(templateCustomization);
    }

    async generateHealth(role) {
        const templateHealth = this.template.Health;


        // do gen
        this.setHealth(templateHealth);
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
        const botDefaultInventory = await this.generateInventoryItems(templateItems.shift(), role = null)
        templateItems.unshift(botDefaultInventory);

        // initiate conquer
        this.setInventory(templateInventory);
    }

    async generateInventoryItems(inventory, role) {
        const parentId = inventory._id;
        return [
            inventory,
            // non-dependent slots
            //await this.generatePockets(parentId, role), // createContainerMap()
            //await this.generateFaceCover(parentId, role),
            //await this.generateTacticalVest(parentId, role), // createContainerMap()
            //await this.generateArmorVest(parentId, role),
            //await this.generateHeadwear(parentId, role),
            //await this.generateEarpiece(parentId, role),
            //await this.generateDogtag(parentId),
            //await this.generateEyewear(parentId),
            //await this.genereateArmBand(parentId),
            //await this.generateScabbard(parentId),
            //await this.generateBackpack(parentId), // createContainerMap()
            //await this.generateSecuredContainer(parentId), // Item.getSize()

            // dependent slots
            //await this.generateWeaponInSlot(parentId, "FirstPrimaryWeapon"),
            //await this.generateWeaponInSlot(parentId, "Holster"),
            //await this.generateWeaponInSlot(parentId, "SecondPrimaryWeapon"),

        ]
    }

    async generatePockets(parentId, role) {
/*         const pockets = [
            "1x2x5": "5af99e9186f7747c447120b8",
            "1x3x5": "60c7272c204bc17802313365",
            "1x2x4": "5af99e9186f7747c447120b8",
        ] */
    }

    async randomProperty(obj) {
        const keys = Object.keys(obj);
        const gay = obj[keys[keys.length * Math.random() << 0]]
        return gay;
    }

    async generateWeaponInSlot(parentId, slot) {
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
        weapon.unshift(await this.generateParent(preset._items[0], parentId))

        console.log("hsajdhsajkdhjksahdjkshajkdhsajkdhsajkdhjksahjkdsa");
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

    async generateMagazinesAndAmmo() {}
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


module.exports.Bot = Bot;

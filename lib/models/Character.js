//const cloneDeep = require("rfdc")();
const cloneDeep = require(`fast-copy`).default

const { logger, getCurrentTimestamp, generateMongoID, round, min, floor } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { Item } = require('./Item');
const { Quest } = require('./Quest');
const { Customization } = require('./Customization');
const { HideoutProduction } = require("./HideoutProduction");

class Character extends BaseModel {
    constructor() {
        super();
    }

    async getEquipmentContainer() {
        return this.Inventory.equipment;
    }

    async getStashContainer() {
        return this.Inventory.stash;
    }

    async getSortingTableContainer() {
        return this.Inventory.sortingTable;
    }

    async getQuestRaidItemsContainer() {
        return this.Inventory.questRaidItems;
    }

    async getQuestStashItemsContainer() {
        return this.Inventory.questStashItems;
    }

    async getInventoryItemByID(itemId) {
        return this.Inventory.items.find(item => item._id === itemId);
    }

    async getInventoryItemsByTpl(itemTpl) {
        return this.Inventory.items.filter(item => item._tpl === itemTpl);
    }

    async getInventoryItemsByParent(parentId) {
        return this.Inventory.items.filter(item => item.parentId === parentId);
    }

    async getHideoutProductionById(recipeId) {
        return this.Hideout.Production[recipeId];
    }

    /**
     * Hideout Areas by name with their int value
     * @returns
     */
    static hideoutAreasInt() {
        return {
            NOTSET: -1,
            VENTS: 0,
            SECURITY: 1,
            LAVATORY: 2,
            STASH: 3,
            GENERATOR: 4,
            HEATING: 5,
            WATER_COLLECTOR: 6,
            MEDSTATION: 7,
            NUTRITION_UNIT: 8,
            REST_SPACE: 9,
            WORKBENCH: 10,
            INTEL_CENTER: 11,
            SHOOTING_RANGE: 12,
            LIBRARY: 13,
            SCAV_CASE: 14,
            ILLUMINATION: 15,
            PLACE_OF_FAME: 16,
            AIR_FILTERING: 17,
            SOLAR_POWER: 18,
            BOOZE_GENERATOR: 19,
            BITCOIN_FARM: 20,
            CHRISTMAS_TREE: 21
        }
    }
    /**
     * Use name to get int value of hideout area
     * @param {string} name UPPERCASE
     * @returns 
     */
    async getHideoutAreaTypeValueByName(name) {
        const areas = Character.hideoutAreasInt();
        return areas[name];
    }

    /**
     * Get hideout area by hideout area int value
     * @param {int} areaTypeId 
     * @returns 
     */
    async getHideoutAreaByType(areaTypeId) {
        return this.Hideout.Areas.find(area => area.type === areaTypeId);
    }

    async getSkills() {
        if (this.Skills.length === 0) {
            this.Skills = {};
        }
        return this.Skills;
    }

    async getPlayerSkill(skillId) {
        let playerSkill = this.Skills.Common.find(iteration => iteration.Id === skillId);

        if (typeof playerSkill === "undefined") {
            return false;
        }

        return playerSkill;
    }

    async getPlayerSkillLevel(skillId) {
        let playerSkill = await this.getPlayerSkill(skillId);

        let level = 0;

        if (playerSkill.Progress < 550) {
            level = await floor(1 / 2 * (-1 + Math.sqrt(0.8 * playerSkill.Progress + 1)));
        } else {
            level = 10 + await floor((playerSkill.Progress - 550) / 100)
            if (level > 51) {
                level = 51;
            }
        }

        return level;
    }

    async isPlayerSkillLevelElite(skillId) {
        let level = await this.getPlayerSkillLevel(skillId);
        return level === 51;
    }

    async getMasterSkill(skillId) {
        let masterSkill = this.Skills.Mastering.find(iteration => iteration.Id === skillId);

        if (typeof masterSkill === "undefined") {
            return false;
        }

        await logger.debug(masterSkill);
    }

    async setHealth(healthData) {
        this.Health.Hydration.Current = healthData.Hydration;
        this.Health.Energy.Current = healthData.Energy;
        for (const bodyPart in this.Health.BodyParts) {
            this.Health.BodyParts[bodyPart].Health.Current = healthData.Health[bodyPart].Current <= 0
                ? 0
                : await round(healthData.Health[bodyPart].Current);
            // I am not sure at all how Effects work, I would need to trigger a broken part to see how to proceed
            if (Object.values(healthData.Health[bodyPart].Effects).length > 0) {
                this.Health.BodyParts[bodyPart].Effects = healthData.Health[bodyPart].Effects;
            }
        }
        this.Health.UpdateTime = await getCurrentTimestamp();
    }

    async setExperience(experiencePoints) {
        this.Info.Experience = experiencePoints;
        return this.Info.Experience;
    }

    async setLevel() {
        const { database: { core: { globals: { config: { exp: { level: { exp_table } } } } } } } = require("../../app");
        const index = exp_table.findIndex((level) => this.Info.Experience < level.exp);
        const level = (index === -1) ? 80 : Number(index); //if -1 then most likely character is max level

        this.Info.Level = level;
    }

    /**
     * Save character progression acquired in Raid
     * @param {object} raidData 
     */
    async saveCharacterRaidProgression(raidData) {
        this.Stats = raidData.profile.Stats;
        this.SurvivorClass = raidData.profile.SurvivorClass;
        this.Info.Level = raidData.profile.Info.Level;
        this.Info.Experience = raidData.profile.Info.Experience;
        this.Quests = await this.questsFix(raidData.profile.Quests);
        this.ConditionCounters = raidData.profile.ConditionCounters;
        this.Encyclopedia = raidData.profile.Encyclopedia;
        this.Skills.Mastering = raidData.profile.Skills.Mastering;
        this.Skills.Common = raidData.profile.Skills.Common;
        this.Skills.Points = raidData.profile.Skills.Points;
        await this.setHealth(raidData.health);
    }

    async questsFix(quests) {
        const output = [];
        for (const quest of quests) {
            const newQuest = await Quest.generateQuestModel(quest);
            output.push(newQuest);
        }
        return output;
    }

    async generateListItemsInContainer(containerID) {
        const listItems = [];
        let parentItems = await this.getInventoryItemsByParent(containerID);
        while (parentItems.length > 0) {
            const childrenList = [];
            listItems.push(...parentItems);
            for (const item of parentItems) {
                childrenList.push(...await this.getInventoryItemsByParent(item._id));
            }
            if (childrenList.length > 0) {
                parentItems = childrenList;
            } else {
                parentItems = [];
            }
        }
        return listItems;
    }

    async addHealthToBodyPart(bodyPart, health) {
        this.Health.BodyParts[bodyPart].Health.Current = await round(this.Health.BodyParts[bodyPart].Health.Current + health);
        if (this.Health.BodyParts[bodyPart].Health.Current > this.Health.BodyParts[bodyPart].Health.Maximum) {
            this.Health.BodyParts[bodyPart].Health.Current = this.Health.BodyParts[bodyPart].Health.Maximum;
        }
        this.Health.UpdateTime = await getCurrentTimestamp();
    }

    async addEnergyHydration(energy = false, hydration = false) {

    }

    async solve() {
        const { UtilityModel } = require("./UtilityModel");
/*         if (this._id)
            await logger.debug(`Solving Character with ID: ${this._id}`); */

        if (this.Customization) {
            for (const [bodyPart, id] of Object.entries(this.Customization)) {
                if (typeof id === "string") {
                    this.Customization[bodyPart] = await Customization.get(id);
                }
            }
        }

        if (this.Inventory.items.length > 0) {
            for (const [index, item] of Object.entries(this.Inventory.items)) {
                this.Inventory.items[index] = await UtilityModel.createModelFromParse("Item", item);
            }
        }

        if (this.Hideout.Production.length > 0) {
            for (const [index, production] of Object.entries(this.Hideout.Production)) {
                this.Hideout.Production[index] = await UtilityModel.createModelFromParse("HideoutProduction", production);
            }
        }

        if (this.Hideout.Areas.length > 0) {
            for (const [index, area] of Object.entries(this.Hideout.Areas)) {
                this.Hideout.Areas[index] = await UtilityModel.createModelFromParse("HideoutArea", area);
            }
        }

        this.Inventory.equipment = await this.getInventoryItemByID(this.Inventory.equipment);
        this.Inventory.stash = await this.getInventoryItemByID(this.Inventory.stash);
        this.Inventory.sortingTable = await this.getInventoryItemByID(this.Inventory.sortingTable);
        this.Inventory.questRaidItems = await this.getInventoryItemByID(this.Inventory.questRaidItems);
        this.Inventory.questStashItems = await this.getInventoryItemByID(this.Inventory.questStashItems);
    }

    async dissolve() {
        //await logger.debug(`Dissolving Character with ID: ${this._id}`);
        const dissolvedClone = await this.clone();
        if (dissolvedClone.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(dissolvedClone.Customization)) {
                if (typeof id === "object") {
                    dissolvedClone.Customization[bodyPart] = dissolvedClone.Customization[bodyPart]._id;
                }
            }
        }

        if (dissolvedClone.Inventory.items.length > 0) {
            for (const [index, item] of Object.entries(dissolvedClone.Inventory.items)) {
                dissolvedClone.Inventory.items[index] = Object.assign({}, item)
            }
        }

        if (dissolvedClone.Hideout.Production.length > 0) {
            for (const [index, production] of Object.entries(dissolvedClone.Hideout.Production)) {
                dissolvedClone.Hideout.Production[index] = Object.assign({}, production)
            }
        }

        if (dissolvedClone.Hideout.Areas.length > 0) {
            for (const [index, area] of Object.entries(dissolvedClone.Hideout.Areas)) {
                dissolvedClone.Hideout.Areas[index] = Object.assign({}, area);
            }
        }

        dissolvedClone.Inventory.equipment = this.Inventory.equipment._id;
        dissolvedClone.Inventory.stash = this.Inventory.stash._id;
        dissolvedClone.Inventory.sortingTable = this.Inventory.sortingTable._id;
        dissolvedClone.Inventory.questRaidItems = this.Inventory.questRaidItems._id;
        dissolvedClone.Inventory.questStashItems = this.Inventory.questStashItems._id;

        return dissolvedClone;
    }

    async getQuest(questId) {
        return this.Quests.find(quest => quest.qid === questId);
    }

    /**
     * 
     * @param {string} id 
     * @param {object} status 
     */
    async updateQuest(id, status) {
        const quest = await this.getQuest(id);
        quest.status = status;
        quest.statusTimers[status] = await getCurrentTimestamp();
    }

    async getIntelCenterBonus() {
        return (await this.getHideoutAreaByType(
            await this.getHideoutAreaTypeValueByName("INTEL_CENTER")).level === 1) ? 5 : 15;
    }

    // Inventory Functionality //

    /**
     * Adds and Item into the players inventory.
     * @param {*} container
     * @param {*} itemId
     * @param {*} children
     * @param {*} amount
     * @param {*} foundInRaid
     * @param {*} customUpd
     * @returns An array of all the items that were added.
     */
    async addItem(container, itemId, children = undefined, amount = 1, foundInRaid = false, customUpd = false) {
        if (!container || !itemId) {
            await logger.error(`[addItem] Unable to add item, the container or itemId wasn't provided.`);
            return false;
        }

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate) {
            await logger.error(`[addItem] Unable to add item, can't get the itemTemplate for itemId ${itemId}.`);
            return false;
        }

        const itemsAdded = [];
        let noSpace = false;
        const stackAmount = (amount - ~~(amount / itemTemplate._props.StackMaxSize) * itemTemplate._props.StackMaxSize) > 0
            ? 1 + ~~(amount / itemTemplate._props.StackMaxSize)
            : ~~(amount / itemTemplate._props.StackMaxSize);

        for (let itemsToAdd = 0; itemsToAdd < stackAmount; itemsToAdd++) {
            if (amount > 0) {
                let itemSize = false;
                const item = await itemTemplate.createAsNewItem();

                if (children) {
                    const childItemArray = []
                    for (const childItem of children) {
                        const childrenAdded = await this.addItemToParent(
                            item,
                            childItem._tpl,
                            childItem.slotId,
                            childItem.amount,
                            foundInRaid,
                            childItem.upd,
                            childItem.children
                        );

                        for (const childAdded of childrenAdded) {
                            childItemArray.push(childAdded);
                            itemsAdded.push(childAdded);
                        }
                    }
                    itemSize = await item.getSize(childItemArray);
                } else {
                    itemSize = await item.getSize();
                }

                const freeSlot = await Item.getFreeSlot(
                    container,
                    this.Inventory.items,
                    itemSize.width,
                    itemSize.height
                );
                if (freeSlot) {
                    item.parentId = container._id;
                    item.slotId = freeSlot.slotId;
                    item.location = {
                        x: freeSlot.x,
                        y: freeSlot.y,
                        r: freeSlot.r
                    };

                    const freshUpd = await Item.createFreshBaseItemUpd(itemTemplate);
                    if (freshUpd !== "error")
                        item.upd = freshUpd;

                    if (amount > itemTemplate._props.StackMaxSize) {
                        amount = amount - itemTemplate._props.StackMaxSize;
                        if (itemTemplate._props.StackMaxSize > 1) {
                            if (!item?.upd)
                                item.upd = {};
                            item.upd.StackObjectsCount = itemTemplate._props.StackMaxSize;
                        }
                    } else {
                        if (typeof item.upd === "undefined") {
                            item.upd = {};
                        }
                        item.upd.StackObjectsCount = amount;
                    }

                    if (foundInRaid) {
                        if (typeof item.upd === "undefined") {
                            item.upd = {};
                        }
                        item.upd.SpawnedInSession = true;
                    } else {
                        if (typeof item.upd === "undefined") {
                            item.upd = {};
                        }
                        item.upd.SpawnedInSession = false;
                    }

                    if (customUpd) {
                        if (typeof item.upd === "undefined") {
                            item.upd = {};
                        }

                        Object.assign(item.upd, customUpd);
                    }


                    this.Inventory.items.push(item);
                    itemsAdded.push(item);
                } else {
                    noSpace = true;
                    await logger.debug(`Unable to add item ${itemId}. No space.`);
                    break;
                }
            }
        }

        if (noSpace) {
            if (itemsAdded.length > 0) {
                for (const itemAdded of itemsAdded) {
                    await this.removeItem(itemAdded, -1);
                }
            }
            await logger.error(`[addItem] Unable to add item, there is not space left.`);
            return false;
        } else if (itemsAdded.length > 0) {
            return itemsAdded;
        } else {
            await logger.debug(`[addItem] Unable to add item ${itemId}. Unknown cause.`);
            return false;
        }
    }

    async addItemToStack(inventoryItems, stackMaxSize, itemToAddStack) {
        let remainingRequestStack = itemToAddStack;
        const modifiedItems = [];
        for (const inventoryItem of inventoryItems) {
            if (inventoryItem.slotId === "hideout") {
                if (inventoryItem.upd.StackObjectsCount < stackMaxSize) {
                    const stackToAdd = await min(remainingRequestStack, stackMaxSize - inventoryItem.upd.StackObjectsCount);
                    inventoryItem.upd.StackObjectsCount += stackToAdd;
                    remainingRequestStack -= stackToAdd;
                    modifiedItems.push(inventoryItem);
                    if (remainingRequestStack === 0) {
                        break;
                    }
                }
            }

        }
        return [modifiedItems, remainingRequestStack];
    }

    /**
     * Adds an Item to a parent item. This can not be used with containers.
     * @param {*} parent 
     * @param {*} itemId 
     * @param {*} slotId 
     * @param {*} amount 
     * @param {*} foundInRaid 
     * @param {*} customUpd 
     * @param {*} children 
     * @returns 
     */
    async addItemToParent(parent, itemId, slotId, amount = 1, foundInRaid = false, customUpd = false, children = false) {
        if (!parent || !itemId || !slotId) {
            return false;
        }

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate) {
            return false;
        }

        let item = await itemTemplate.createAsNewItem();
        item.parentId = parent._id
        item.slotId = slotId;

        if (amount > 1 && amount <= itemTemplate._props.StackMaxSize && itemTemplate._props.StackMaxSize > 1) {
            item.upd = {}
            item.upd.StackObjectsCount = amount;
        } else {
            if (itemTemplate._props.StackMaxSize > 1) {
                item.upd = {}
                item.upd.StackObjectsCount = itemTemplate._props.StackMaxSize;
            }
        }

        if (foundInRaid) {
            if (typeof item.upd === "undefined") {
                item.upd = {}
            }
            item.upd.SpawnedInSession = true;
        } else {
            if (typeof item.upd === "undefined") {
                item.upd = {}
            }
            item.upd.SpawnedInSession = false;
        }

        if (customUpd) {
            if (typeof item.upd === "undefined") {
                item.upd = {}
            }

            Object.assign(item.upd, customUpd);
        }

        let itemsAdded = [];

        if (children) {
            for (let childItem of children) {
                let childrenAdded = await this.addItemToParent(item, childItem._tpl, childItem.slotId, childItem.amount, foundInRaid, childItem.upd, childItem.children);
                for (let childAdded of childrenAdded) {
                    itemsAdded.push(childAdded)
                }
            }
        }

        this.Inventory.items.push(item);
        itemsAdded.push(item);
        return itemsAdded;
    }

    async removeItem(itemId, amount = 1) {
        if (!itemId) {
            return false;
        }

        const output = {
            changed: [],
            removed: []
        };

        const item = await this.getInventoryItemByID(itemId);
        if (!item) {
            await logger.debug(item)
        }
        const children = await item.getAllChildItemsInInventory(this.Inventory.items);
        if (children) {
            for (const child of children) {
                await this.removeInventoryItemByID(child._id);
                output.removed.push(child);
            }
        }

        if (amount !== -1 && item?.upd?.StackObjectsCount && amount < item.upd.StackObjectsCount) {
            item.upd.StackObjectsCount = item.upd.StackObjectsCount - amount;
            output.changed.push(item);
            return output;
        } else {
            await this.removeInventoryItemByID(item._id);
            output.removed.push(item);
            return output;
        }
    }

    async moveItems(item) {
        const movedItems = {};

        if (item.fromOwner) {
            if (item.fromOwner.type === "Mail") {
                const redeemed = await this.retrieveRewardItems(item);
                if (!redeemed) return movedItems;
                Object.assign(movedItems, ...await this.moveItemIntoProfile(item, redeemed));
            }
            //if (item.fromOwner.id === scavId)
        } else {
            Object.assign(movedItems, await this.moveItem(item));
        }

        return movedItems;
    }

    async retrieveRewardItems(mail) {
        const { Profile } = require("./Profile");
        const { dialogues } = await Profile.get(this.aid);

        for (const d in dialogues) {
            const messages = dialogues[d].messages;
            for (const message of messages) {
                if (Object.keys(message.items).length === 0) continue;
                if (message._id === mail.fromOwner.id) {
                    const familyIds = await Item.findAndReturnChildrenAsIds(mail.item, message.items.data);
                    const output = [];

                    message.items.data = message.items.data.filter(reward => {
                        if (familyIds.includes(reward._id)) output.push(reward);
                        if (!familyIds.includes(reward._id)) return reward;
                    });

                    if (message.items.data.length === 0) message.items = {};
                    if (dialogues[d].attachmentsNew > 0) dialogues[d].attachmentsNew -= 1;
                    return output;
                }
            };
        }
    }

    async moveItem(item) {
        await logger.debug(`Move request with params:
        Container ID: ${item.to.id}
        Container Type: ${item.to.container}
        Item ID: ${item.item}
        Location Data:`);
        await logger.debug(item.to.location);

        switch (item.to.container) {
            case "hideout":
                await logger.debug(`Trying to move item to/in hideout`);
                const stashContainer = await this.getStashContainer();
                if (item.to.id === stashContainer._id) {
                    return this.moveItemToHideout(item);
                } else {
                    await logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                    return false;
                }

            case "main":
                await logger.debug(`Trying to move item to/in main`);
                if (await this.getInventoryItemByID(item.to.id)) {
                    return this.moveItemToMain(item);
                } else {
                    await logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                    return false;
                }

            case "cartridges":
                await logger.debug(`Trying to move item to/in cartridges`);
                if (await this.getInventoryItemByID(item.to.id)) {
                    return this.moveItemToCartridges(item);
                } else {
                    await logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                    return false;
                }

            default:
                await logger.debug(`Trying to move item to equipment slot ${item.to.container}`);
                if (await this.getInventoryItemByID(item.to.id)) {
                    return this.moveItemToEquipmentSlot(item);
                } else {
                    await logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                    return false;
                }
        }
    }

    async moveItemIntoProfile(item, rewards) {
        const output = [];
        for (const reward of rewards) {
            if (item.item === reward._id) {
                reward.parentId = item.to.id;
                reward.slotId = item.to.container;

                if (item.to?.location) reward.location = item.to.location;
                else delete reward.location;
            }
            output.push(reward);
        }
        this.Inventory.items.push(...output);
        return output;
    }

    async moveItemWithinProfile(item) {
        if (!item.item) {
            await logger.error("Move request failed: No item id")
            return false;
        }

        const itemSearch = await this.getInventoryItemByID(item.item);
        if (itemSearch) {
            await logger.debug(`Located item with item ID ${item.item}`);

            if (item.to.location) {
                itemSearch.location = item.to.location;
                itemSearch.location.r = (item.to.location.r === "Vertical" ? 1 : 0);
            } else if (!item.to.location && itemSearch.location) {
                delete itemSearch.location;
            }

            itemSearch.slotId = item.to.container;
            itemSearch.parentId = item.to.id;
            return itemSearch;
        }

        await logger.debug(`Unable to locate item with item ID ${item.item}`);
        return false;
    }

    async moveItemToEquipmentSlot(item) {
        return this.moveItemWithinProfile(item);
    }

    async moveItemToHideout(item) {
        return this.moveItemWithinProfile(item);
    }

    async moveItemToMain(item) {
        return this.moveItemWithinProfile(item);
    }

    async moveItemToCartridges(item) {
        return this.moveItemWithinProfile(item);
    }

    async splitItems(item) {
        const splitedItems = {};
        const splitedItem = await this.splitItem(item.item, item.count, item.container.container, item.container.id, item.container.location);
        const newItems = cloneDeep(splitedItem);
        delete newItems.location;
        delete newItems.slotId;
        delete newItems.parentId;
        Object.assign(splitedItems, newItems);
        return splitedItems;
    }

    async splitItem(itemId, splitStackCount, slotId, containerId, location) {
        await logger.debug(`Split request with params:
        Container ID: ${containerId}
        slot ID: ${slotId}
        Item ID: ${itemId}
        Split stack count: ${splitStackCount}
        Location Data: ${location}`);

        const item = await this.getInventoryItemByID(itemId);
        if (item) {
            item.upd.StackObjectsCount -= splitStackCount;
            const newItemModel = await Item.get(item._tpl);
            const newItem = await newItemModel.createAsNewItem();
            newItem.parentId = containerId;
            newItem.slotId = slotId;
            newItem.location = location;
            newItem.upd = { StackObjectsCount: splitStackCount };
            this.Inventory.items.push(newItem);
            return newItem;
        }
        return false;
    }

    async removeInventoryItemByID(itemId) {
        const indexOfItem = this.Inventory.items.findIndex(item => item._id === itemId);
        const removedItems = this.Inventory.items.splice(indexOfItem, 1);
        return removedItems.length > 0;
    }

    async mergeItems(item) {
        const mergedItems = {};

        const mergedItem = item?.fromOwner?.type === "Mail"
            ? await this.mergeItem(item, ...await this.retrieveRewardItems(item))
            : await this.mergeItem(item);

        Object.assign(mergedItems, mergedItem);
        return mergedItems;
    }

    async mergeItem(item, reward = null) {
        const destinationItem = await this.getInventoryItemByID(item.with);
        if (destinationItem) {

            const mergedItem = reward
                ? reward // need to account for mail
                : await this.getInventoryItemByID(item.item);

            if (mergedItem) {
                if (!mergedItem.upd) mergedItem["upd"] = {};
                if (!mergedItem.upd.StackObjectsCount) {
                    mergedItem.upd.StackObjectsCount = 1;
                }
                destinationItem.upd.StackObjectsCount += mergedItem.upd.StackObjectsCount;
                await this.removeInventoryItemByID(item.item);
                return { _id: item.item };
            }
            await logger.error(`Merge request: couldn't find merged stack ${item.item}`);
            return false;
        }
        await logger.error(`Merge request: couldn't find destination stack ${item.with}`);
        return false;
    }

    async removeItems(item) {
        const removedItems = {};
        await this.removeItem(item.item, -1);
        Object.assign(removedItems, { _id: item.item });
        return removedItems;
    }

    // HIDEOUT -- START // - consumption rate is per second //
    async hideoutTick(specialData) {

        let cyclicUpdateDifference;
        const currentTime = Date.now();
        if (typeof specialData.lastCyclicUpdate !== "undefined") {
            cyclicUpdateDifference = (currentTime - specialData.lastCyclicUpdate) / 1000;
        }

        let fuelReturn = await this.hideoutCalculateFuelUsage(cyclicUpdateDifference);
        let bitcoinReturn = await this.hideoutBitcoinProduction(cyclicUpdateDifference);

        return !!(fuelReturn || bitcoinReturn);
    }

    async hideoutCalculateFuelUsage(cyclicUpdateDifference) {
        if (await this.isGeneratorActive()) {
            let fuelContainer = await this.getPrimaryFuelContainer();
            if (fuelContainer) {
                if (typeof fuelContainer.upd === "undefined") {
                    fuelContainer.upd = {};
                }

                if (typeof fuelContainer.upd.Resource === "undefined") {
                    const templateItem = await Item.get(fuelContainer._tpl);
                    if (templateItem) {
                        fuelContainer.upd.Resource = {};
                        fuelContainer.upd.Resource.Value = templateItem._props.Resource;
                    } else {
                        await logger.error(`[hideoutTick] Unable to get template item of fuel item with tplId ${fuelContainer._tpl} .`);
                        await logger.debug(fuelContainer);
                    }
                }

                let consumptionMultiplier = 1
                let solarPower = await this.getHideoutAreaByType(18)
                if (solarPower && solarPower.level > 0) {
                    consumptionMultiplier = 0.5
                }

                const { database } = require("../../app");
                //await logger.debug(`[hideoutTick] Calculating fuel consumption: Available Fuel [${fuelContainer.upd.Resource.Value}] - time since last update in seconds [${cyclicUpdateDifference}] * (generator fuel flow rate [${database.core.hideoutSettings.generatorFuelFlowRate}] * consumption multiplier [${consumptionMultiplier}])`)
                let cycleConsumption = cyclicUpdateDifference * (database.core.hideoutSettings.generatorFuelFlowRate * consumptionMultiplier);
                let fuelAfterConsumption = fuelContainer.upd.Resource.Value - cycleConsumption;

                if (fuelAfterConsumption > 0) {
                    fuelContainer.upd.Resource.Value = fuelAfterConsumption;
                } else {
                    await this.setGeneratorActive(false);
                }
                return true;
            }
        }

        return false;
    }


    async hideoutBitcoinProduction(cyclicUpdateDifference) {
        if (!await this.isGeneratorActive()) {
            return false;
        }

        let bitcoinFarm = await this.getHideoutAreaByType(await this.getHideoutAreaTypeValueByName("BITCOIN_FARM"));
        if (!bitcoinFarm) {
            await logger.error(`[hideoutBitcoinProduction] Unable to find bitcoin farm.`);
            return;
        }

        let bitcoinProduction = this.Hideout.Production["5d5c205bd582a50d042a3c0e"];
        if (typeof bitcoinProduction === "undefined") {
            return false;
        }

        const hideoutProductionTemplate = await HideoutProduction.get(bitcoinProduction.RecipeId);
        if (!hideoutProductionTemplate) {
            await logger.error(`[hideoutBitcoinProduction] Unknown hideout production with Id ${bitcoinProduction.RecipeId} in hideoutProduction database.`);
            return;
        }

        let maxBitcoins = 3;

        if (await this.isPlayerSkillLevelElite("HideoutManagement")) {
            maxBitcoins = 5;
        }

        let graphicCards = bitcoinFarm.slots.length;
        let storedBitcoins = bitcoinProduction.Products.length;
        if (storedBitcoins < maxBitcoins && graphicCards > 0) {
            let bitcoinProductionTime = hideoutProductionTemplate.productionTime / (1 + (graphicCards - 1) * 0.041225);
            bitcoinProduction.Progress += (100 / bitcoinProductionTime) * cyclicUpdateDifference;

            if (bitcoinProduction.Progress / 100 > 1) {
                let bitcoinsToAdd = Math.floor(bitcoinProduction.Progress / 100);
                let timeLeft = (bitcoinProduction.Progress / 100 - bitcoinsToAdd) * 100
                let availableBitcoins = maxBitcoins - storedBitcoins;
                if (bitcoinsToAdd > availableBitcoins) {
                    bitcoinsToAdd = availableBitcoins;
                    bitcoinProduction.Progress = 0;
                } else {
                    bitcoinProduction.Progress = timeLeft;
                }

                for (let i = 0; i < bitcoinsToAdd; i++) {
                    const bitcoin = {
                        _id: await generateMongoID(),
                        _tpl: hideoutProductionTemplate.endProduct,
                        count: hideoutProductionTemplate.count
                    };
                    bitcoinProduction.Products.push(bitcoin);
                }
            }
            return true;
        } else {
            bitcoinProduction.Progress = 0;
            return false
        }
    }

    async applyHideoutBonus(bonus) {
        // Special bonuses //
        switch (bonus.type) {
            case "MaximumEnergyReserve":
                this.Health.Energy.Maximum += bonus.value;
                break;
        }

        await logger.debug(`Bonus ${bonus.type} added to character ${this._id}.`)
        await logger.debug(bonus);

        this.Bonuses.push(bonus);
        return true;
    }

    async getPrimaryFuelContainer() {
        let generator = await this.getHideoutAreaByType(4)
        let slot = generator.slots.find(slot => slot !== undefined);

        if (generator && slot !== null && typeof slot !== "undefined" && typeof slot.item !== "undefined") {
            return slot.item[0];
        } else {
            return false;
        }
    }

    async removeHideoutProductionById(recipeId) {
        delete this.Hideout.Production[recipeId];
    }

    async setGeneratorActive(active) {
        const generator = await this.getHideoutAreaByType(4)
        if (generator) {
            await generator.setActive(active);

            return true;
        }
        return false;
    }

    async isGeneratorActive() {
        const generator = await this.getHideoutAreaByType(4)
        if (typeof generator.active !== "undefined") {
            return generator.isActive();
        } else {
            return false;
        }
    }

    // HIDEOUT -- END //

    // Examine //

    async examineItem(itemId) {
        if (!itemId) {
            await logger.error("Examine request failed: No itemId");
            return false;
        }

        this.Encyclopedia[itemId] = true;
        return true;
    }

    // EXP -- START //
    async getExperience() {
        if (!this.Info.Experience) {
            this.Info.Experience = 0;
        }
        return this.Info.Experience;
    }

    async addExperience(experiencePoints) {
        this.Info.Experience += + experiencePoints;
        return this.Info.Experience;
    }

    // EXP -- END //

    async clearOrphans() {
        let noOrphans = true;
        for (const item of this.Inventory.items) {
            if (item.parentId) {
                if (!await this.getInventoryItemByID(item.parentId)) {
                    await logger.warn(`Removing orphan item ${item._id} (Missing parent: ${item.parentId})`);
                    this.Inventory.items.splice(this.Inventory.items.indexOf(item), 1);
                    noOrphans = false;
                }
            }
        }


        if (!noOrphans) {
            await this.clearOrphans();
        }

        return true;
    }

    async wearSuit(customization) {
        const bottomSuitId = "5cd944d01388ce000a659df9";
        //const topSuitId = "5cd944ca1388ce03a44dc2a4"; // not used but it's here for future reference
        if (customization._parent === bottomSuitId) {
            this.Customization.Feet = await Customization.get(customization._props.Feet);
        } else {
            this.Customization.Body = await Customization.get(customization._props.Body);
            this.Customization.Hands = await Customization.get(customization._props.Hands);
        }
    }
}

class CharacterUtilities {
    /**
 * Example function on how to add items.
 */
    static async addTestPistol() {
        let weaponTemplate = "5cadc190ae921500103bb3b6";
        let customUpd = {
            "upd": {
                "Repairable": {
                    "MaxDurability": 100,
                    "Durability": 100
                },
                "FireMode": {
                    "FireMode": "single"
                }
            }
        }

        let children = [
            {
                "_tpl": "5cadc1c6ae9215000f2775a4",
                "slotId": "mod_barrel",
                "children": [
                    {
                        "_tpl": "5cadc390ae921500126a77f1",
                        "slotId": "mod_muzzle"
                    },
                ]
            },
            {
                "_tpl": "5cadc431ae921500113bb8d5",
                "slotId": "mod_pistol_grip"
            },
            {
                "_tpl": "5cadc55cae921500103bb3be",
                "slotId": "mod_reciever",
                "children": [
                    {
                        "_tpl": "5cadd940ae9215051e1c2316",
                        "slotId": "mod_sight_rear",
                        "upd": {
                            "Sight": {
                                "ScopesCurrentCalibPointIndexes": [
                                    0
                                ],
                                "ScopesSelectedModes": [
                                    0
                                ],
                                "SelectedScope": 0
                            }
                        }
                    },
                    {
                        "_tpl": "5cadd919ae921500126a77f3",
                        "slotId": "mod_sight_front",
                        "upd": {
                            "Sight": {
                                "ScopesCurrentCalibPointIndexes": [
                                    0
                                ],
                                "ScopesSelectedModes": [
                                    0
                                ],
                                "SelectedScope": 0
                            }
                        }
                    },
                ]
            },
            {
                "_tpl": "5cadc2e0ae9215051e1c21e7",
                "slotId": "mod_magazine",
                "children": [
                    {
                        "_tpl": "56d59d3ad2720bdb418b4577",
                        "slotId": "cartridges",
                        "amount": 17
                    },
                ]
            },
        ]

        await this.addItem(await this.getStashContainer(), weaponTemplate, children, 1, false, customUpd);
    }

    /**
     * Example function on how to add items. Merge stacks.
     */
    static async addTestRubbles() {
        const itemTemplate = "5449016a4bdc2d6f028b456f";

        await this.addItem(await this.getStashContainer(), itemTemplate, false, 2500, false, false);
    }

    /**
     * Example function on how to add items.
     */
    static async addTestRifle() {
        let weaponTemplate = "5447a9cd4bdc2dbd208b4567";
        let customUpd = {
            "upd": {
                "Repairable": {
                    "MaxDurability": 100,
                    "Durability": 100
                },
                "FireMode": {
                    "FireMode": "single"
                }
            }
        }

        let children = [
            {
                "_tpl": "55d4b9964bdc2d1d4e8b456e",
                "slotId": "mod_pistol_grip"
            },
            {
                "_tpl": "55d4887d4bdc2d962f8b4570",
                "slotId": "mod_magazine",
                "children": [
                    {
                        "_tpl": "54527a984bdc2d4e668b4567",
                        "slotId": "cartridges",
                        "upd": {
                            "StackObjectsCount": 30
                        }
                    },
                ]
            },
            {
                "_tpl": "55d355e64bdc2d962f8b4569",
                "slotId": "mod_reciever",
                "children": [
                    {
                        "_tpl": "55d3632e4bdc2d972f8b4569",
                        "slotId": "mod_barrel",
                        "children": [
                            {
                                "_tpl": "544a38634bdc2d58388b4568",
                                "slotId": "mod_muzzle"
                            },
                            {
                                "_tpl": "5ae30e795acfc408fb139a0b",
                                "slotId": "mod_gas_block"
                            },
                        ]
                    },
                    {
                        "_tpl": "5ae30db85acfc408fb139a05",
                        "slotId": "mod_handguard"
                    },
                    {
                        "_tpl": "5ae30bad5acfc400185c2dc4",
                        "slotId": "mod_sight_rear",
                        "upd": {
                            "Sight": {
                                "ScopesCurrentCalibPointIndexes": [
                                    0
                                ],
                                "ScopesSelectedModes": [
                                    0
                                ],
                                "SelectedScope": 0
                            }
                        }
                    },
                ]
            },
            {
                "_tpl": "5649be884bdc2d79388b4577",
                "slotId": "mod_stock",
                "children": [
                    {
                        "_tpl": "55d4ae6c4bdc2d8b2f8b456e",
                        "slotId": "mod_stock_000"
                    },
                ]
            },
            {
                "_tpl": "55d44fd14bdc2d962f8b456e",
                "slotId": "mod_charge"
            },
        ]

        await this.addItem(await this.getStashContainer(), weaponTemplate, children, 2, false, customUpd);
    }
}
module.exports.CharacterUtilities = CharacterUtilities;
module.exports.Character = Character;

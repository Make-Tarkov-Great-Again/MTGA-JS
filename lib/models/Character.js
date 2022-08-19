const cloneDeep = require("rfdc")();
const { logger, getCurrentTimestamp, generateMongoID } = require("../../utilities");
const { BaseModel } = require("./BaseModel");
const { Item } = require('./Item');
const { Customization } = require('./Customization');

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

    async getHideoutAreaByType(areaTypeId) {
        return this.Hideout.Areas.find(area => area.type === areaTypeId);
    }

    async getExperience() {
        if (!this.Info.Experience) {
            this.Info.Experience = 0;
        }
        return this.Info.Experience;
    }

    async getSkills() {
        if (this.Skills.length === 0) {
            this.Skills = {};
        }
        return this.Skills;
    }

    async setHealth(healthData) {
        this.Health.Hydration.Current = healthData.Hydration;
        this.Health.Energy.Current = healthData.Energy;
        for (const bodyPart in this.Health.BodyParts) {
            this.Health.BodyParts[bodyPart].Health.Current = Math.round(healthData.Health[bodyPart].Current);
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

    async saveCharacterRaidProgression(raidData) {
        this.Stats = raidData.profile.Stats;
        this.Info.Level = raidData.profile.Info.Level;
        this.Info.Experience = raidData.profile.Info.Experience;
        this.Quests = raidData.profile.Quests;
        this.ConditionCounter = raidData.profile.ConditionCounters;
        this.Encyclopedia = raidData.profile.Encyclopedia;
        this.Skills.Mastering = raidData.profile.Skills.Mastering;
        this.Skills.Common = raidData.profile.Skills.Common;
        this.Skills.Points = raidData.profile.Skills.Points;
        await this.setHealth(raidData.health);
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
        this.Health.BodyParts[bodyPart].Health.Current = Math.round(this.Health.BodyParts[bodyPart].Health.Current + health);
        if (this.Health.BodyParts[bodyPart].Health.Current > this.Health.BodyParts[bodyPart].Health.Maximum) {
            this.Health.BodyParts[bodyPart].Health.Current = this.Health.BodyParts[bodyPart].Health.Maximum;
        }
        this.Health.UpdateTime = await getCurrentTimestamp();
    }

    async solve() {
        const { UtilityModel } = require("./UtilityModel");
        if (this._id)
            logger.logDebug(`Solving Character with ID: ${this._id}`);

        if (this.Customization !== undefined) {
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
        logger.logDebug(`Dissolving Character with ID: ${this._id}`);
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

    async addQuest(quest) {
        this.Quests.push({
            qid: quest._id,
            startTime: await getCurrentTimestamp(),
            status: "Started"
        });
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
            logger.logError(`[addItem] Unable to add item, the container or itemId wasn't provided.`);
            return false;
        }

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate) {
            logger.logError(`[addItem] Unable to add item, can't get the itemTemplate for itemId ${itemId}.`);
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
                            childItem.foundInRaid,
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

                    if (amount > itemTemplate._props.StackMaxSize) {
                        amount = amount - itemTemplate._props.StackMaxSize;
                        if (itemTemplate._props.StackMaxSize > 1) {
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
                    logger.logDebug(`Unable to add item ${itemId}. No space.`);
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
            logger.logError(`[addItem] Unable to add item, there is not space left.`);
            return false;
        } else if (itemsAdded.length > 0) {
            return itemsAdded;
        } else {
            logger.logDebug(`[addItem] Unable to add item ${itemId}. Unknown cause.`);
            return false;
        }
    }

    async addItemToStack(inventoryItems, stackMaxSize, itemToAddStack) {
        let remainingRequestStack = itemToAddStack;
        const modifiedItems = [];
        for (const inventoryItem of inventoryItems) {
            if (inventoryItem.slotId === "hideout") {
                if (inventoryItem.upd.StackObjectsCount < stackMaxSize) {
                    const stackToAdd = Math.min(remainingRequestStack, stackMaxSize - inventoryItem.upd.StackObjectsCount);
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
                let childrenAdded = await this.addItemToParent(item, childItem._tpl, childItem.slotId, childItem.amount, childItem.foundInRaid, childItem.upd, childItem.children);
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
        logger.logDebug(item);
        const children = await item.getAllChildItemsInInventory(this.Inventory.items);
        if (children) {
            for (const child of children) {
                await this.removeInventoryItemByID(child._id);
                output.removed.push(child);
            }
        }

        if (amount !== -1 && typeof item.upd !== "undefined" && typeof item.upd.StackObjectsCount !== "undefined" && amount < item.upd.StackObjectsCount) {
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
        const movedItem = await this.moveItem(item.to.id, item.to.container, item.item, item.to.location);
        Object.assign(movedItems, movedItem);
        return movedItems;
    }

    async moveItem(containerID, containerType, itemId, locationData) {
        logger.logDebug(`Move request with params:
        Container ID: ${containerID}
        Container Type: ${containerType}
        Item ID: ${itemId}
        Location Data:`);
        logger.logDebug(locationData);

        switch (containerType) {
            case "hideout":
                logger.logDebug(`Trying to move item to/in hideout`);
                const stashContainer = await this.getStashContainer();
                if (containerID === stashContainer._id) {
                    return this.moveItemToHideout(itemId, locationData);
                } else {
                    logger.logError(`Move request failed: Invalid container with ID ${containerID}`);
                    return false;
                }

            case "main":
                logger.logDebug(`Trying to move item to/in main`);
                if (await this.getInventoryItemByID(containerID)) {
                    return this.moveItemToMain(itemId, locationData, containerID);
                } else {
                    logger.logError(`Move request failed: Invalid container with ID ${containerID}`);
                    return false;
                }

            case "cartridges":
                logger.logDebug(`Trying to move item to/in cartridges`);
                if (await this.getInventoryItemByID(containerID)) {
                    return this.moveItemToCartridges(itemId, locationData, containerID);
                } else {
                    logger.logError(`Move request failed: Invalid container with ID ${containerID}`);
                }

            default:
                logger.logDebug(`Trying to move item to equipment slot ${containerType}`);
                if (await this.getInventoryItemByID(containerID)) {
                    return this.moveItemToEquipmentSlot(itemId, containerType, containerID);
                } else {
                    logger.logError(`Move request failed: Invalid container with ID ${containerID}`);
                    return false;
                }
        }
    }

    async moveItemUsingSlotID(itemId, locationData, slotId, containerID) {
        if (!itemId) {
            logger.logError("Move request failed: No itemId")
            return false;
        }

        const itemSearch = await this.getInventoryItemByID(itemId);
        if (itemSearch) {
            logger.logDebug(`Located item with item ID ${itemId}`);

            if (locationData) {
                itemSearch.location = locationData;
                itemSearch.location.r = (locationData.r === "Vertical" ? 1 : 0);
            } else if (!locationData && itemSearch.location) {
                delete itemSearch.location;
            }

            itemSearch.slotId = slotId;
            itemSearch.parentId = containerID;
            return itemSearch;
        }

        logger.logDebug(`Unable to locate item with item ID ${itemId}`);
        return false;
    }

    async moveItemToEquipmentSlot(itemId, equipmentSlotId, containerID) {
        return this.moveItemUsingSlotID(itemId, null, equipmentSlotId, containerID);
    }

    async moveItemToHideout(itemId, locationData) {
        const stashContainer = await this.getStashContainer();
        return this.moveItemUsingSlotID(itemId, locationData, "hideout", stashContainer._id);
    }

    async moveItemToMain(itemId, locationData, containerID) {
        return this.moveItemUsingSlotID(itemId, locationData, "main", containerID);
    }

    async moveItemToCartridges(itemId, locationData, containerID) {
        return this.moveItemUsingSlotID(itemId, locationData, "cartridges", containerID);
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
        logger.logDebug(`Split request with params:
        Container ID: ${containerId}
        slot ID: ${slotId}
        Item ID: ${itemId}
        Split stack count: ${splitStackCount}
        Location Data:`);
        logger.logDebug(location);

        const item = await this.getInventoryItemByID(itemId);
        if (item) {
            item.upd.StackObjectsCount -= splitStackCount;
            const newItemModel = await Item.get(item._tpl);
            const newItem = await newItemModel.createAsNewItem();
            newItem.parentId = containerId;
            newItem.slotId = slotId;
            newItem.location = location;
            newItem.upd = {StackObjectsCount: splitStackCount};
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
        const mergedItem = await this.mergeItem(item.item, item.with);
        Object.assign(mergedItems, mergedItem);
        return mergedItems;
    }

    async mergeItem(mergedStackId, destinationStackId) {
        const destinationItem = await this.getInventoryItemByID(destinationStackId);
        if (destinationItem) {
            const mergedItem = await this.getInventoryItemByID(mergedStackId);
            if (mergedItem) {
                if (!mergedItem.upd.StackObjectsCount) {
                    mergedItem.upd.StackObjectsCount = 1;
                }
                destinationItem.upd.StackObjectsCount += mergedItem.upd.StackObjectsCount;
                await this.removeInventoryItemByID(mergedStackId);
                return { _id: mergedStackId };
            }
            logger.logError(`Merge request: couldn't find merged stack ${mergedStackId}`);
            return false;
        }
        logger.logError(`Merge request: couldn't find destination stack ${destinationStackId}`);
        return false;
    }

    async removeItems(item) {
        const removedItems = {};
        await this.removeItem(item.item, -1);
        Object.assign(removedItems, { _id: item.item });
        return removedItems;
    }

    // Hideout //

    async applyHideoutBonus(bonus) {
        // Special bonuses //
        switch (bonus.type) {
            case "MaximumEnergyReserve":
                this.Health.Energy.Maximum += bonus.value;
                break;
        }

        logger.logDebug(`Bonus ${bonus.type} added to character ${this._id}.`)
        logger.logDebug(bonus);

        this.Bonuses.push(bonus);
        return true;
    }

    async removeHideoutProductionById(recipeId) {
        delete this.Hideout.Production[recipeId];
    }

    // Examine //

    async examineItem(itemId) {
        if (!itemId) {
            logger.logError("Examine request failed: No itemId");
            return false;
        }

        this.Encyclopedia[itemId] = true;
        return true;
    }

    // EXP //

    async addExperience(experiencePoints) {
        // Required! This will create the object as an integer, otherwise the response will error out.
        if (!this.Info.Experience) {
            this.Info.Experience = 0;
        }

        this.Info.Experience += experiencePoints;
        return this.Info.Experience;
    }

    async clearOrphans() {
        let noOrphans = true;
        for (const item of this.Inventory.items) {
            if (item.parentId) {
                if (!await this.getInventoryItemByID(item.parentId)) {
                    logger.logWarning(`Removing orphan item ${item._id} (Missing parent: ${item.parentId})`);
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

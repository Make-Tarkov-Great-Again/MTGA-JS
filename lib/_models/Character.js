
const { logger, getCurrentTimestamp, generateMongoID, round, min, floor, cloneDeep, stringify } = require("../utilities/index.mjs").default;
const { BaseModel } = require("./BaseModel");
const { Item } = require('./Item');
const { Quest } = require('./Quest');
const { Customization } = require('./Customization');
const { HideoutProduction } = require("./HideoutProduction");

/* const { database: { core: {
    gameplay: { hideout },
    globals: { config: { exp: { level: { exp_table } } } } } } } = require("../../app"); */

class Character extends BaseModel {
    constructor() {
        super();
    }

/*     async getEquipmentContainer() {
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

    async getInventoryItemBySlotId(slotId) {
        return this.Inventory.items.find(item => item.slotId === slotId);
    }

    async getInventoryItemsByTpl(itemTpl) {
        return this.Inventory.items.filter(item => item._tpl === itemTpl);
    }

    async getInventoryItemsByParent(parentId) {
        return this.Inventory.items.filter(item => item.parentId === parentId);
    } */

    async getHideoutProductionById(recipeId) {
        return this.Hideout.Production[recipeId];
    }

    /*     async setCharacterNickname(newNickname) {
            this.Info.Nickname = newNickname;
            this.Info.LowerNickname = newNickname.toLowerCase();
        } */

    /**
     * Hideout Areas by name with their int value
     * @returns
     */
    static async hideoutAreasInt() {
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
            CHRISTMAS_TREE: 21,
            EMERGENCY_WALL: 22,
            GYM: 23
        };
    }
    /**
     * Use name to get int value of hideout area
     * @param {string} name UPPERCASE
     * @returns 
     */
    async getHideoutAreaTypeValueByName(name) {
        const areas = await Character.hideoutAreasInt();
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

/*     async setSkills(skillData) {
        this.Skills = skillData;
    }

    async getSkills() {
        if (this.Skills.length === 0) {
            this.Skills = {};
        }
        return this.Skills;
    } */

/*     async getPlayerSkill(character, skillId) {
        const playerSkill = character.Skills.Common.find(iteration => iteration.Id === skillId);
        return playerSkill ?? false;
    }

    async getPlayerSkillLevel(skillId) {
        const playerSkill = await this.getPlayerSkill(skillId);
        let level = 0;

        if (playerSkill.Progress < 550) {
            level = floor(1 / 2 * (-1 + Math.sqrt(0.8 * playerSkill.Progress + 1)));
        } else {
            level = 10 + floor((playerSkill.Progress - 550) / 100);
            if (level > 51) {
                level = 51;
            }
        }

        return level;
    }

    async isPlayerSkillLevelElite(skillId) {
        return this.getPlayerSkillLevel(skillId) == 51;
    } */

/*     async getMasterSkill(skillId) {
        const masterSkill = this.Skills.Mastering.find(iteration => iteration.Id === skillId);

        if (typeof masterSkill === "undefined") {
            return false;
        }

        logger.warn(masterSkill);
    } */

    /* async setHealth(healthData) {
        this.Health.Hydration.Current = healthData.Hydration;
        this.Health.Energy.Current = healthData.Energy;

        for (const bodyPart in this.Health.BodyParts) {
            this.Health.BodyParts[bodyPart].Health.Current = healthData.Health[bodyPart].Current <= 0
                ? 0
                : round(healthData.Health[bodyPart].Current);
            // I am not sure at all how Effects work, I would need to trigger a broken part to see how to proceed
            if (Object.values(healthData.Health[bodyPart].Effects).length > 0) {
                this.Health.BodyParts[bodyPart].Effects = healthData.Health[bodyPart].Effects;
            }
        }
        this.Health.UpdateTime = getCurrentTimestamp();
    }

    async setExperience(experiencePoints) {
        this.Info.Experience = experiencePoints;
        return this.Info.Experience;
    }

    async setLevel() {
        const index = exp_table.findIndex((level) => this.Info.Experience < level.exp);
        const level = (index === -1) ? 80 : Number(index); //if -1 then most likely character is max level

        this.Info.Level = level;
    }
    async setHideout(hideoutData) {
        this.Hideout = hideoutData;
    }

    async setTradersInfo(traderInfoData) {
        this.TradersInfo = traderInfoData;
    }

    async setEncyclopedia(encyclopediaData) {
        this.Encyclopedia = encyclopediaData;
    }

    async setConditionCounters(conditionCountersData) {
        this.ConditionCounters = conditionCountersData;
    }

    async setStats(statsData) {
        this.Stats = statsData;
    }

    async setQuests(questData) {
        this.Quests = questData;
    }

    async setUnlockedInfo(unlockedInfoData) {
        this.UnlockedInfo = unlockedInfoData;
    } */



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

/*     async addHealthToBodyPart(bodyPart, health) {
        this.Health.BodyParts[bodyPart].Health.Current = round(this.Health.BodyParts[bodyPart].Health.Current + health);
        if (this.Health.BodyParts[bodyPart].Health.Current > this.Health.BodyParts[bodyPart].Health.Maximum) {
            this.Health.BodyParts[bodyPart].Health.Current = this.Health.BodyParts[bodyPart].Health.Maximum;
        }
        this.Health.UpdateTime = getCurrentTimestamp();
    }

    async addEnergyHydration(energy = false, hydration = false) {

    } */

    async solve() {
        const { UtilityModel } = require("./UtilityModel");
        /*         if (this._id)
                    logger.warn(`Solving Character with ID: ${this._id}`); */

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

        if (this.Quests.length > 0) {
            for (const [index, quest] of Object.entries(this.Quests)) {
                this.Quests[index] = await UtilityModel.createModelFromParse("Quest", quest);
            }
        }

        this.Inventory.equipment = await this.getEquipmentContainer();
        this.Inventory.stash = await this.getStashContainer();
        this.Inventory.sortingTable = await this.getSortingTableContainer();
        this.Inventory.questRaidItems = await this.getQuestRaidItemsContainer();
        this.Inventory.questStashItems = await this.getQuestStashItemsContainer();
    }

    async dissolve() {
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
                dissolvedClone.Inventory.items[index] = Object.assign({}, item);
            }
        }

        if (dissolvedClone.Hideout.Production.length > 0) {
            for (const [index, production] of Object.entries(dissolvedClone.Hideout.Production)) {
                dissolvedClone.Hideout.Production[index] = Object.assign({}, production);
            }
        }

        if (dissolvedClone.Hideout.Areas.length > 0) {
            for (const [index, area] of Object.entries(dissolvedClone.Hideout.Areas)) {
                dissolvedClone.Hideout.Areas[index] = Object.assign({}, area);
            }
        }

        dissolvedClone.Inventory.equipment = await this.getEquipmentContainer();
        dissolvedClone.Inventory.stash = await this.getStashContainer();
        dissolvedClone.Inventory.sortingTable = await this.getSortingTableContainer();
        dissolvedClone.Inventory.questRaidItems = await this.getQuestRaidItemsContainer();
        dissolvedClone.Inventory.questStashItems = await this.getQuestStashItemsContainer();

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
        quest.statusTimers[status] = getCurrentTimestamp();
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
            logger.error(`[addItem] Unable to add item, the container or itemId wasn't provided.`);
            return false;
        }

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate) {
            logger.error(`[addItem] Unable to add item, can't get the itemTemplate for itemId ${itemId}.`);
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
                    const childItemArray = [];
                    for (let child = 0; child < children.length; child++) {
                        const childrenAdded = await this.addItemToParent(
                            item,
                            children[child]._tpl,
                            children[child].slotId,
                            children[child].amount,
                            foundInRaid,
                            children[child].upd,
                            children[child].children
                        );

                        for (let added = 0; added < childrenAdded.length; added++) {

                            childItemArray.push(childrenAdded[added]);
                            itemsAdded.push(childrenAdded[added]);
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
                if (!freeSlot) {
                    noSpace = true;
                    logger.error(`[addItem] Unable to add item ${itemId}. No space.`);
                    break;
                }
                item.parentId = container._id;
                item.slotId = freeSlot.slotId;
                item.location = {
                    x: freeSlot.x,
                    y: freeSlot.y,
                    r: freeSlot.r,
                    isSearched: true
                };

                const freshUpd = await itemTemplate.createFreshBaseItemUpd();
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
            }
        }

        if (noSpace) {
            if (itemsAdded.length > 0) {
                for (let i = 0; i < itemsAdded.length; i++) {
                    await this.removeItem(itemsAdded[i], -1);
                }
            }
            logger.error(`[addItem] Unable to add item, there is not space left.`);
            return false;
        }
        if (itemsAdded.length > 0)
            return itemsAdded;
        logger.error(`[addItem] Unable to add item ${itemId}. Unknown cause.`);
        return false;
    }

    async addItemToStack(inventoryItems, stackMaxSize, itemToAddStack) {
        let remainingRequestStack = itemToAddStack;
        const modifiedItems = [];
        for (const inventoryItem of inventoryItems) {
            if (remainingRequestStack === 0)
                break;

            if (inventoryItem.slotId === "hideout" && inventoryItem.upd.StackObjectsCount < stackMaxSize) {
                const stackToAdd = min(remainingRequestStack, stackMaxSize - inventoryItem.upd.StackObjectsCount);
                inventoryItem.upd.StackObjectsCount += stackToAdd;
                remainingRequestStack -= stackToAdd;
                modifiedItems.push(inventoryItem);
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
        if (!parent || !itemId || !slotId)
            return false;

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate)
            return false;

        const item = await itemTemplate.createAsNewItem();
        Object.assign(item, { parentId: parent._id, slotId });

        if (amount > 1 && amount <= itemTemplate._props.StackMaxSize && itemTemplate._props.StackMaxSize > 1)
            item.upd = { StackObjectsCount: amount };
        else {
            if (itemTemplate._props.StackMaxSize > 1)
                item.upd = { StackObjectsCount: itemTemplate._props.StackMaxSize };
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

        const itemsAdded = [];

        if (children) {
            for (const childItem of children) {
                const childrenAdded = await this.addItemToParent(item, childItem._tpl, childItem.slotId, childItem.amount, foundInRaid, childItem.upd, childItem.children);
                for (const childAdded of childrenAdded) {
                    itemsAdded.push(childAdded);
                }
            }
        }

        this.Inventory.items.push(item);
        itemsAdded.push(item);
        return itemsAdded;
    }

    async removeItem(itemId, amount = 1) {
        const output = {
            changed: [],
            removed: []
        };

        const item = itemId?._id
            ? await this.getInventoryItemByID(itemId._id)
            : await this.getInventoryItemByID(itemId)

        if (!item) {
            logger.warn(item);
            return false;
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
        }
        await this.removeInventoryItemByID(item._id);
        output.removed.push(item);
        return output;
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
        logger.warn(`Move request with params:
        Container ID: ${item.to.id}
        Container Type: ${item.to.container}
        Item ID: ${item.item}
        Location Data: ${item.to?.location ? stringify(item.to.location) : "Location Unavailable"}`);

        switch (item.to.container) {
            case "hideout":
                logger.warn(`Trying to move item to/in hideout`);

                const stash = await this.getStashContainer();
                const sortingTable = await this.getSortingTableContainer()

                if ([stash, sortingTable].includes(item.to.id)) {
                    return this.moveItemToHideout(item);
                }
                logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                return false;

            case "main":
                logger.warn(`Trying to move item to/in main`);
                if (await this.getInventoryItemByID(item.to.id))
                    return this.moveItemToMain(item);
                logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                return false;

            case "cartridges":
                logger.warn(`Trying to move item to/in cartridges`);
                if (await this.getInventoryItemByID(item.to.id))
                    return this.moveItemToCartridges(item);
                logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                return false;

            default:
                logger.warn(`Trying to move item to equipment slot ${item.to.container}`);
                if (await this.getInventoryItemByID(item.to.id))
                    return this.moveItemToEquipmentSlot(item);
                logger.error(`Move request failed: Invalid container with ID ${item.to.id}`);
                return false;
        }
    }

    async moveItemIntoProfile(item, rewards) {
        const output = [];
        for (const reward of rewards) {
            if (item.item === reward._id) {
                reward.parentId = item.to.id;
                reward.slotId = item.to.container;

                if (item?.to?.location) {
                    reward.location = item.to.location;
                    reward.location.r = (item.to.location.r === "Vertical") ? 1 : 0;
                }
                else if (reward.location)
                    delete reward.location;

            }
            output.push(reward);
        }
        this.Inventory.items.push(...output);
        return output;
    }

    async moveItemWithinProfile(item) {
        if (!item.item) {
            logger.error("Move request failed: No item id");
            return false;
        }

        const itemSearch = await this.getInventoryItemByID(item.item);
        if (itemSearch) {
            logger.warn(`Located item with item ID ${item.item}`);

            if (item?.to?.location) {
                itemSearch.location = item.to.location;
                itemSearch.location.r = (item.to.location.r === "Vertical") ? 1 : 0;
            } else if (itemSearch.location) {
                delete itemSearch.location;
            }

            itemSearch.slotId = item.to.container;
            itemSearch.parentId = item.to.id;
            return itemSearch;
        }

        logger.error(`[moveItemWithinProfile] Unable to locate item with item ID ${item.item}`);
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
        const splitedItem = await this.splitItem(item);
        Object.assign(splitedItems, splitedItem);
        return splitedItems;
    }

    async splitItem(item) {
        logger.warn(`Split request with params:
        Container ID: ${item.container.id}
        slot ID: ${item.container.container}
        Item ID: ${item.item}
        Split stack count: ${item.count}
        Location Data: ${item.container?.location ? stringify(item.container.location) : "Location Unavailable"}`);

        const itemSearch = await this.getInventoryItemByID(item.item);
        if (itemSearch) {
            itemSearch.upd.StackObjectsCount -= item.count; // set stack being split from
            const newItemModel = await Item.get(itemSearch._tpl);
            const newItem = await newItemModel.createAsNewItemWithParent(item.container.id);

            newItem.slotId = item.container.container;
            if (item.container?.location) {
                newItem.location = item.container.location;
                newItem.location.r = (item.container.location.r === "Vertical") ? 1 : 0;
            }

            newItem.upd = {
                StackObjectsCount: item.count //set new stack
            };

            this.Inventory.items.push(await cloneDeep(newItem));

            /* split output example

            {
                "_id": "62d2b652245ffec499021148",
                "_tpl": "56dff3afd2720bba668b4567",
                "upd": {
                    "StackObjectsCount": 15
                }
            } 
            */
            delete newItem.location;
            delete newItem.slotId;
            delete newItem.parentId;

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
                if (!mergedItem?.upd)
                    mergedItem.upd = {};
                if (!mergedItem.upd?.StackObjectsCount)
                    mergedItem.upd.StackObjectsCount = 1;

                destinationItem.upd.StackObjectsCount += mergedItem.upd.StackObjectsCount;
                await this.removeInventoryItemByID(item.item);
                return { _id: item.item };
            }
            logger.error(`Merge request: couldn't find merged stack ${item.item}`);
            return false;
        }
        logger.error(`Merge request: couldn't find destination stack ${item.with}`);
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
        const currentTime = getCurrentTimestamp();
        if (typeof specialData.lastCyclicUpdate !== "undefined") {
            cyclicUpdateDifference = (currentTime - specialData.lastCyclicUpdate) / 1000;
        }

        const fuelReturn = await this.hideoutCalculateFuelUsage(cyclicUpdateDifference);
        const bitcoinReturn = await this.hideoutBitcoinProduction(cyclicUpdateDifference);

        return !!(fuelReturn || bitcoinReturn);
    }

    async hideoutCalculateFuelUsage(cyclicUpdateDifference) {
        if (await this.isGeneratorActive()) {
            const fuelContainer = await this.getPrimaryFuelContainer();
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
                        logger.error(`[hideoutTick] Unable to get template item of fuel item with tplId ${fuelContainer._tpl} .`);
                        logger.warn(fuelContainer);
                    }
                }

                let consumptionMultiplier = 1;
                const solarPower = await this.getHideoutAreaByType(18);
                if (solarPower && solarPower.level > 0) {
                    consumptionMultiplier = 0.5;
                }

                const { database } = require("../../app.mjs");
                const cycleConsumption = cyclicUpdateDifference * (database.core.hideoutSettings.generatorFuelFlowRate * consumptionMultiplier);
                const fuelAfterConsumption = fuelContainer.upd.Resource.Value - cycleConsumption;

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
        if (!await this.isGeneratorActive())
            return false;

        const bitcoinFarm = await this.getHideoutAreaByType(await this.getHideoutAreaTypeValueByName("BITCOIN_FARM"));
        if (!bitcoinFarm) {
            logger.error(`[hideoutBitcoinProduction] Unable to find bitcoin farm.`);
            return false;
        }

        const bitcoinProduction = this.Hideout.Production["5d5c205bd582a50d042a3c0e"];
        if (typeof bitcoinProduction === "undefined")
            return false;

        const hideoutProductionTemplate = await HideoutProduction.get(bitcoinProduction.RecipeId);
        if (!hideoutProductionTemplate) {
            logger.error(`[hideoutBitcoinProduction] Unknown hideout production with Id ${bitcoinProduction.RecipeId} in hideoutProduction database.`);
            return false;
        }

        let maxBitcoins = 3;

        if (await this.isPlayerSkillLevelElite("HideoutManagement"))
            maxBitcoins = 5;

        const graphicCards = bitcoinFarm.slots.length;
        const storedBitcoins = bitcoinProduction.Products.length;
        if (storedBitcoins < maxBitcoins && graphicCards > 0) {
            const bitcoinProductionTime = hideoutProductionTemplate.productionTime / (1 + (graphicCards - 1) * 0.041225);
            bitcoinProduction.Progress += (100 / bitcoinProductionTime) * cyclicUpdateDifference;

            if (bitcoinProduction.Progress / 100 > 1) {
                let bitcoinsToAdd = Math.floor(bitcoinProduction.Progress / 100);
                const timeLeft = (bitcoinProduction.Progress / 100 - bitcoinsToAdd) * 100;
                const availableBitcoins = maxBitcoins - storedBitcoins;
                if (bitcoinsToAdd > availableBitcoins) {
                    bitcoinsToAdd = availableBitcoins;
                    bitcoinProduction.Progress = 0;
                } else {
                    bitcoinProduction.Progress = timeLeft;
                }

                const id = await generateMongoID();
                for (let i = 0; i < bitcoinsToAdd; i++) {
                    const bitcoin = {
                        _id: id,
                        _tpl: hideoutProductionTemplate.endProduct,
                        count: hideoutProductionTemplate.count
                    };
                    bitcoinProduction.Products.push(bitcoin);
                }
            }
            return true;
        }
        bitcoinProduction.Progress = 0;
        return false;
    }

    async applyHideoutBonus(bonus) {
        // Special bonuses //
        switch (bonus.type) {
            case "MaximumEnergyReserve":
                this.Health.Energy.Maximum += bonus.value;
                break;
        }

        logger.warn(`Bonus ${bonus.type} added to character ${this._id}.`);
        logger.warn(bonus);

        this.Bonuses.push(bonus);
        return true;
    }

    async getPrimaryFuelContainer() {
        const generator = await this.getHideoutAreaByType(4);
        const slot = generator.slots.find(slot => slot !== undefined);

        if (generator && slot !== null && typeof slot !== "undefined" && typeof slot.item !== "undefined")
            return slot.item[0];
        return false;
    }

    async removeHideoutProductionById(recipeId) {
        delete this.Hideout.Production[recipeId];
    }

    async setGeneratorActive(active) {
        const generator = await this.getHideoutAreaByType(4);
        if (generator) {
            await generator.setActive(active);
            return true;
        }
        return false;
    }

    async isGeneratorActive() {
        const generator = await this.getHideoutAreaByType(4);
        if (typeof generator.active !== "undefined")
            return generator.isActive();
        return false;
    }

    // HIDEOUT -- END //

    // Examine //

/*     async examineItem(character, itemId) {
        if (!itemId) {
            logger.error("Examine request failed: No itemId");
            return false;
        }

        character.Encyclopedia[itemId] = true;
        return true;
    }

    // EXP -- START //
    async getExperience(character) {
        if (!character.Info.Experience)
            character.Info.Experience = 0;
        return character.Info.Experience;
    }

    async addExperience(character, experiencePoints) {
        character.Info.Experience += experiencePoints;
        return character.Info.Experience;
    } */

    // EXP -- END //

    async clearOrphans() {
        let noOrphans = true;

        for (const item of this.Inventory.items) {
            if (item.parentId) {
                if (!await this.getInventoryItemByID(item.parentId)) {
                    logger.warn(`Removing orphan item ${item._id} (Missing parent: ${item.parentId})`);
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

/*     async wearSuit(customization) {
        if (customization._parent === "5cd944d01388ce000a659df9") {
            this.Customization.Feet = await Customization.get(customization._props.Feet);
        } else if (customization._parent === "5cd944ca1388ce03a44dc2a4") {
            this.Customization.Body = await Customization.get(customization._props.Body);
            this.Customization.Hands = await Customization.get(customization._props.Hands);
        }
    } */

    async updateCharacter() {
        if (!this.getHideoutAreaByType(22)) {
            this.Hideout.Areas.push({
                "type": 22,
                "level": 1,
                "active": true,
                "passiveBonusesEnabled": true,
                "completeTime": 0,
                "constructing": false,
                "slots": [],
                "lastRecipe": ""
            });
        }

        if (!this.getHideoutAreaByType(23)) {
            this.Hideout.Areas.push({
                "type": 23,
                "level": 0,
                "active": true,
                "passiveBonusesEnabled": true,
                "completeTime": 0,
                "constructing": false,
                "slots": [],
                "lastRecipe": ""
            });
        }
        if (!this.Hideout?.Improvements) {
            this.Hideout.Improvements = {};
        }

        if (!this.Hideout?.Seed) {
            this.Hideout.Seed = 0; //will be applied after raid i think????
        }
        if (!this.UnlockedInfo) {
            this.UnlockedInfo = {
                unlockedProductionRecipe: []
            }
        }

        if (!this.TradersInfo["638f541a29ffd1183d187f57"]) {
            this.Info.GameVersion === "developer"
                ? this.TradersInfo["638f541a29ffd1183d187f57"] = {
                    "unlocked": true,
                    "disabled": false,
                    "salesSum": 100000000,
                    "standing": 99
                }
                : this.TradersInfo["638f541a29ffd1183d187f57"] = {
                    "unlocked": false,
                    "disabled": false,
                    "salesSum": 0,
                    "standing": 0.2
                }
        }

        const check = (hideout.wallUnlockInSeconds + this.Info.RegistrationDate) < getCurrentTimestamp()
        if (check) {
            const type = await this.getHideoutAreaTypeValueByName("EMERGENCY_WALL");
            const wall = await this.getHideoutAreaByType(type);

            if (wall && wall.level === 1) {
                wall.level++;
            }
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

        const container = await this.getInventoryItemByID(await this.getStashContainer())
        await this.addItem(container, weaponTemplate, children, 1, false, customUpd);
    }

    /**
     * Example function on how to add items. Merge stacks.
     */
    static async addTestRubbles() {
        const itemTemplate = "5449016a4bdc2d6f028b456f";

        const container = await this.getInventoryItemByID(await this.getStashContainer())
        await this.addItem(container, itemTemplate, false, 2500, false, false);
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
        const container = await this.getInventoryItemByID(await this.getStashContainer())
        await this.addItem(container, weaponTemplate, children, 2, false, customUpd);
    }
}
module.exports.CharacterUtilities = CharacterUtilities;
module.exports.Character = Character;

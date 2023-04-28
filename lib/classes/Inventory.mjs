import { database } from "../../app.mjs";

import { Item } from "./Item.mjs";
import { Character } from "./Character.mjs";
import { Trader } from "./Trader.mjs";
import { Ragfair } from "./Ragfair.mjs";
import { Dialogues } from "./Dialogues.mjs";

import { logger, stringify } from "../utilities/_index.mjs";


const ITEM_NODES = {
    AMMO_CONTAINER: "543be5cb4bdc2deb348b4568"
};


export class Inventory {

    static get(sessionID) {
        return database.profiles[sessionID].character.Inventory;
    }

    static getEquipmentContainer(characterInventory) {
        return characterInventory.equipment;
    }

    static getStashContainer(characterInventory) {
        return characterInventory.stash;
    }

    static getSortingTableContainer(characterInventory) {
        return characterInventory.sortingTable;
    }

    static getQuestRaidItemsContainer(characterInventory) {
        return characterInventory.questRaidItems;
    }

    static getQuestStashItemsContainer(characterInventory) {
        return characterInventory.questStashItems;
    }

    static getInventoryItemByID(characterInventory, itemId) {
        return characterInventory.items.find(item => item._id === itemId);
    }

    static getInventoryItemBySlotId(characterInventory, slotId) {
        return characterInventory.items.find(item => item.slotId === slotId);
    }

    static getInventoryItemsByTpl(characterInventory, itemTpl) {
        return characterInventory.items.filter(item => item._tpl === itemTpl);
    }

    static getInventoryItemsByParent(characterInventory, parentId) {
        return characterInventory.items.filter(item => item.parentId === parentId);
    }

    /**
    * Find item object by ID in player inventory for Handover Quest, and adjust item stack as needed
    * @param {object} player 
    * @param {string} itemId 
    * @param {int} amount 
    * @param {object} output 
    * @returns
    */
    static findAndChangeHandoverItemsStack = async (characterInventory, itemId, amount, output) => {
        const index = characterInventory.items.findIndex(item => item._id === itemId);
        if (index < 0) return;
        if (amount > 0) {
            const item = characterInventory.items[index];
            item.upd.StackObjectsCount = amount;

            output.items.change.push({
                "_id": item._id,
                "_tpl": item._tpl,
                "parentId": item.parentId,
                "slotId": item.slotId,
                "location": item.location,
                "upd": {
                    "StackObjectsCount": item.upd.StackObjectsCount
                }
            });
        }
    };

    static addItemToInventory(character, container, itemData, amountToBeAdded = 1, children = []) {
        const totalItemsAdded = [];
        while (amountToBeAdded > 0) {
            const currentIterItemsAdded = [];
            const containerMap = Item.generateContainerMap(container, character.Inventory.items);

            const item = this.createItemForPurchase(itemData, container); //this should be created outside the function
            amountToBeAdded = this.adjustStackSize(item, itemData, amountToBeAdded);

            const itemSize = Item.getSize(item, children);

            const freeSlot = Item.getFreeSlot(
                containerMap,
                itemSize
            );

            if (!freeSlot) {
                logger.error(`[addItem] Unable to add item ${item._tpl}. No space.`);
                return;
            }

            item.slotId = freeSlot.slotId;
            item.location = {
                x: freeSlot.x,
                y: freeSlot.y,
                r: freeSlot.r
            };

            if (Item.isSearchableItem(itemData))
                item.location["isSearched"] = database.core.gameplay.items.allItemsArePreSearched;

            this.adjustItemForPurchase(currentIterItemsAdded, item, itemData, children);
            if (!currentIterItemsAdded) {
                logger.error(`[Inventory.addItem] Unable to add item ${itemData._id}. Unknown cause.`);
                return;
            }
            totalItemsAdded.push(...currentIterItemsAdded);
            character.Inventory.items.push(...currentIterItemsAdded);
        }

        return totalItemsAdded;
    }

    static createItemForPurchase(itemData, container) {
        const item = Item.createAsNewItemWithParent(itemData._id, container._id);
        const freshUpd = Item.createFreshBaseItemUpd(itemData);
        item.upd = freshUpd ? freshUpd : {};

        item.upd.SpawnedInSession = database.core.gameplay.trading.tradePurchasedIsFoundInRaid;
        return item;
    }

    static adjustStackSize(item, itemData, itemStackToAdd) {
        if (itemStackToAdd >= itemData._props.StackMaxSize) { //if itemStackToAdd is larger than stack objects size, 
            itemStackToAdd -= itemData._props.StackMaxSize; //then reduce itemStackToAdd
            if (itemData._props.StackMaxSize > 1) {
                item.upd.StackObjectsCount = itemData._props.StackMaxSize;
            }
        } else {
            item.upd.StackObjectsCount = itemStackToAdd;
            itemStackToAdd -= itemStackToAdd;
        }
        return itemStackToAdd;
    }

    static adjustItemForPurchase(newItemsToBeAdded, item, itemData, children = []) {
        //this can be adjusted later if we need to separate it
        // Handle Ammoboxes //
        if (itemData._parent === ITEM_NODES.AMMO_CONTAINER) {
            if (!itemData._props.StackSlots)
                logger.warn(`[buyFromTrader] AmmoBox ${item._tpl} does not have StackSlots`);
            const ammoInAmmoBox = Item.handleAmmoBoxes(itemData, item._id);
            newItemsToBeAdded.push(...ammoInAmmoBox);
        }

        for (const child of children) {
            const childrenAdded = this.addItemToParent(
                item,
                child._tpl,
                child.slotId,
                1,
                child.upd,
                child.children
            );
            newItemsToBeAdded.push(...childrenAdded);
        }

        newItemsToBeAdded.push(item);
    }

    /**
     * Try to fill stacks of the same Item in Inventory, return remainder
     * @param {*} itemsMerged array to return for client to know what has been merged
     * @param {*} stacksInInventory stack(s) of same items in inventory 
     * @param {*} itemsMaxStackSize  max size of item being added to stack
     * @param {*} amountToAddToStack amount to add to stack in InventoryItems
     * @returns {<Promise>int}
     */
    static addItemToStack(itemsMerged, stacksInInventory, itemsMaxStackSize, amountToAddToStack) {
        let remainder = amountToAddToStack;
        for (let i = stacksInInventory.length - 1; i >= 0; i--) {
            if (remainder === 0)
                return remainder;

            const inventoryItem = stacksInInventory[i];
            if (!inventoryItem.slotId === "hideout" || inventoryItem.upd.StackObjectsCount >= itemsMaxStackSize)
                continue;

            const stackToAdd = Math.min(remainder, (itemsMaxStackSize - inventoryItem.upd.StackObjectsCount));
            inventoryItem.upd.StackObjectsCount += stackToAdd;

            remainder = (remainder - stackToAdd);

            itemsMerged.push(inventoryItem);
        }
        return remainder;
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
    static addItemToParent(parent, itemId, slotId, amount = 1, customUpd = false, children = []) {
        if (!parent || !itemId || !slotId)
            return false;

        const itemTemplate = Item.get(itemId);
        if (!itemTemplate)
            return false;

        const item = Item.createAsNewItemWithParent(itemId, parent._id);
        item.slotId = slotId;

        if (!item.upd)
            item.upd = {};

        item.upd.StackObjectsCount = (amount > 1 && amount <= itemTemplate._props.StackMaxSize) ? amount : itemTemplate._props.StackMaxSize;

        if (customUpd)
            item.upd = customUpd;

        item.upd.SpawnedInSession = database.core.gameplay.trading.tradePurchasedIsFoundInRaid;

        const itemsAdded = [];
        for (const childItem of children) {
            const childrenAdded = this.addItemToParent(item, childItem._tpl, childItem.slotId, childItem.amount, childItem.upd, childItem.children);
            for (const childAdded of childrenAdded) {
                itemsAdded.push(childAdded);
            }
        }
        itemsAdded.push(item);
        return itemsAdded;
    }

    static removeItem(characterInventory, characterChanges, itemId, amount = 1) {
        const item = itemId?._id
            ? this.getInventoryItemByID(characterInventory, itemId._id)
            : this.getInventoryItemByID(characterInventory, itemId)

        if (!item) {
            logger.error(`[removeItem] ${itemId} does not exist in character inventory`);
            return false;
        }
        const children = Item.getParentAndChildren(item._id, characterInventory.items);
        if (children.length > 1) {
            // TODO: CHECK IF IT WORK, ADAPT OTHERWISE
            for (const child of children) {
                this.removeInventoryItemByID(characterInventory, child._id);
                characterChanges.items.del.push(child);
            }
        }

        if (amount !== -1 && item?.upd?.StackObjectsCount && amount < item.upd.StackObjectsCount) {
            item.upd.StackObjectsCount = item.upd.StackObjectsCount - amount;
            characterChanges.items.change.push(item);
            return true;
        }
        this.removeInventoryItemByID(characterInventory, item._id);
        characterChanges.items.del.push(item);
        logger.info(`${amount} of Item ${item._id} removed from Inventory`);
        return true;
    }

    static moveItems(character, moveAction) {
        if (moveAction.fromOwner && moveAction.fromOwner.type === "Mail") {
            const redeemed = Dialogues.retrieveRewardItems(character, moveAction);
            if (!redeemed)
                return;
            this.moveItemIntoProfile(character.Inventory, moveAction, redeemed);
            return;
        }
        this.moveItem(character.Inventory, moveAction);
    }

    static moveItem(characterInventory, moveAction) {
        logger.warn(`Move request with params:
            Container ID: ${moveAction.to.id}
            Container Type: ${moveAction.to.container}
            Item ID: ${moveAction.item}
            Location Data: ${moveAction.to?.location ? stringify(moveAction.to.location) : "Location Unavailable"}`);

        switch (moveAction.to.container) {
            case "hideout":
                logger.warn(`Trying to move item to/in hideout`);

                const stash = this.getStashContainer(characterInventory);
                const sortingTable = this.getSortingTableContainer(characterInventory);

                if ([stash, sortingTable].includes(moveAction.to.id)) {
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                }
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            case "main":
                logger.warn(`Trying to move item to/in main`);
                if (this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            case "cartridges":
                logger.warn(`Trying to move item to/in cartridges`);
                if (this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            default:
                logger.warn(`Trying to move item to equipment slot ${moveAction.to.container}`);
                if (this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;
        }
    }

    static moveItemIntoProfile(characterInventory, moveAction, rewards) {
        const output = [];
        for (const reward of rewards) {
            if (moveAction.item === reward._id) {
                reward.parentId = moveAction.to.id;
                reward.slotId = moveAction.to.container;

                if (moveAction?.to?.location) {
                    reward.location = moveAction.to.location;
                    reward.location.r = (moveAction.to.location.r === "Vertical") ? 1 : 0;
                }
                else if (reward.location)
                    delete reward.location;

            }
            output.push(reward);
        }
        characterInventory.items.push(...output);
        return output;
    }

    static moveItemWithinProfile(characterInventory, moveAction) {
        if (!moveAction.item) {
            logger.error("Move request failed: No item id");
            return false;
        }

        const itemSearch = this.getInventoryItemByID(characterInventory, moveAction.item);
        if (itemSearch) {
            logger.warn(`Located item with item ID ${moveAction.item}`);

            if (moveAction?.to?.location) {
                itemSearch.location = moveAction.to.location;
                itemSearch.location.r = (moveAction.to.location.r === "Vertical") ? 1 : 0;
            } else if (itemSearch.location) {
                delete itemSearch.location;
            }

            itemSearch.slotId = moveAction.to.container;
            itemSearch.parentId = moveAction.to.id;
            return itemSearch;
        }

        logger.error(`[moveItemWithinProfile] Unable to locate item with item ID ${moveAction.item}`);
        return false;
    }

    static splitItem(characterInventory, characterChanges, moveAction) {
        logger.warn(`Split request with params:
            Container ID: ${moveAction.container.id}
            slot ID: ${moveAction.container.container}
            Item ID: ${moveAction.item}
            Split stack count: ${moveAction.count}
            Location Data: ${moveAction.container?.location ? stringify(moveAction.container.location) : "Location Unavailable"}`);

        const itemSearch = this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!itemSearch) {
            logger.error(`[splitItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }
        itemSearch.upd.StackObjectsCount -= moveAction.count; // set stack being split from
        const newItem = Item.createAsNewItemWithParent(itemSearch._tpl, moveAction.container.id);

        newItem.slotId = moveAction.container.container;
        if (moveAction.container?.location) {
            newItem.location = moveAction.container.location;
            newItem.location.r = (moveAction.container.location.r === "Vertical") ? 1 : 0;
        }

        newItem.upd = {
            StackObjectsCount: moveAction.count //set new stack
        };

        characterInventory.items.push(structuredClone(newItem));

        delete newItem.location;
        delete newItem.slotId;
        delete newItem.parentId;

        characterChanges.items.new.push(newItem);
    }

    static removeInventoryItemByID(characterInventory, itemId) {
        const index = characterInventory.items
            .findIndex(item => item._id === itemId);
        if (index !== -1) {
            characterInventory.items.splice(index, 1);
        }
        else logger.error(`[removeInventoryItemByID] Item ${itemId} not found in Inventory!`);
    }

    static tagItem(characterInventory, moveAction) {
        const item = this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!item) {
            logger.error(`[tagItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }

        item.upd = item.upd || {};
        item.upd.Tag = item.upd.Tag || {};
        item.upd.Tag.Color = moveAction.TagColor;
        item.upd.Tag.Name = moveAction.TagName;
    }

    static mergeItem(character, characterChanges, moveAction) {
        const characterInventory = character.Inventory;
        const destinationItem = this.getInventoryItemByID(characterInventory, moveAction.with);
        if (!destinationItem) {
            logger.error(`Merge request: couldn't find destination stack ${moveAction.with}`);
            return;
        }

        const mergedItem = moveAction.fromOwner?.type === "Mail"
            ? Dialogues.retrieveRewardItems(character, moveAction)
            : this.getInventoryItemByID(characterInventory, moveAction.item);

        if (!mergedItem) {
            logger.error(`Merge request: couldn't find merged stack ${moveAction.item}`);
            return;
        }

        mergedItem.upd = mergedItem.upd || {};
        mergedItem.upd.StackObjectsCount = mergedItem.upd.StackObjectsCount || 1;

        destinationItem.upd.StackObjectsCount += mergedItem.upd.StackObjectsCount;
        this.removeInventoryItemByID(characterInventory, moveAction.item);
        characterChanges.items.del.push({ _id: moveAction.item });
    }

    static toggleItem(characterInventory, moveAction) {
        const item = this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!item) {
            logger.error(`[toggleItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }

        item.upd = item.upd || {};
        item.upd.Togglable = item.upd.Togglable || {};

        item.upd.Togglable.On = moveAction.value;
    }

    static bindItem(characterInventory, moveAction) {
        for (const index in characterInventory.fastPanel) {
            if (characterInventory.fastPanel[index] === moveAction.item)
                delete characterInventory.fastPanel[index];
        }
        characterInventory.fastPanel[moveAction.index] = moveAction.item;
    }

    static swapItem(characterInventory, moveAction) {
        for (let i = characterInventory.items.length - 1; i > -1; i--) {
            const item = characterInventory.items[i];
            if (item._id === moveAction.item) {
                item.parentId = moveAction.to.id;         // parentId
                item.slotId = moveAction.to.container;    // slotId
                item.location = moveAction.to.location;    // location
            }

            if (item._id === moveAction.item2) {
                item.parentId = moveAction.to2.id;
                item.slotId = moveAction.to2.container;
                delete item.location;
            }
        }
    }

    static foldItem(characterInventory, moveAction) {
        const item = this.getInventoryItemByID(characterInventory, moveAction.item);

        if (!item) {
            logger.error(`[foldItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }

        item.upd ??= {};
        item.upd.Foldable ??= {};
        item.upd.Foldable.Folded = moveAction.value;
    }


    static transferItem(characterInventory, moveAction) {
        const itemFrom = characterInventory.items.find(item => item._id === moveAction.item);
        const itemTo = characterInventory.items.find(item => item._id === moveAction.with);

        if (!itemFrom || !itemTo) {
            return;
        }

        updateItemCount(itemFrom, -Math.min(moveAction.count, getItemCount(itemFrom)));
        updateItemCount(itemTo, Math.min(moveAction.count, getItemCount(itemFrom)));

        function getItemCount(item) {
            return item.upd?.StackObjectsCount ?? 1;
        }

        function updateItemCount(item, count) {
            item.upd ??= {};
            item.upd.StackObjectsCount ??= 1;
            item.upd.StackObjectsCount += count;
        }
    }

    static examineItem(character, moveAction) {
        const { item } = moveAction;

        let templateItem;
        if (!moveAction.fromOwner) {
            const inventoryItem = Inventory.getInventoryItemByID(character.Inventory, item);
            if (!inventoryItem) {
                logger.error(`[examineItem] Examine Request failed: Unable to find item database template of itemId ${item}`);
                return false;
            }
            templateItem = Item.get(inventoryItem._tpl);
        } else {
            const { fromOwner: { type, id } } = moveAction;

            switch (type) {
                case "Trader":
                    const traderOffer = Trader.getAssortItemByID(Trader.get(id).assort, item);
                    if (!traderOffer) {
                        logger.error(`[examineItem] Examine Request failed: Unable to find offer for ${item} in trader ${id} `);
                        return false;
                    }
                    templateItem = Item.get(traderOffer._tpl);
                    break;

                case "RagFair":
                    const offer = Ragfair.getOfferById(id).items[0];
                    templateItem = Item.get(offer._tpl);
                    break;

                case "HideoutUpgrade":
                case "HideoutProduction":
                case "ScavCase":
                    templateItem = Item.get(item);
                    break;

                default:
                    logger.error(`[examineItem] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                    return false;
            }
        }
        if (!templateItem) {
            logger.error(`[examineItem] Examine Request failed: Unable to find item database template`);
            return false;
        }

        if (!Character.examineItem(character, templateItem._id)) {
            logger.error(`[examineItem] Examine Request failed: Unable to examine itemId ${templateItem._id}`);
            return false;
        }
        Character.addExperience(character, templateItem._props.ExamineExperience);
    }

    static openRandomLootContainer(character, characterChanges, moveAction) {
        const { seasonalEvents: { loot } } = database.core.globals;

        const lootbox = Inventory.getInventoryItemByID(character.Inventory, moveAction.item);
        const stash = Inventory.getInventoryItemByID(character.Inventory, Inventory.getStashContainer(characterInventory));
        const rewards = Item.createWeightedList(loot[lootbox._tpl].prizes);

        for (let i = 0, length = getRandomFromArray(loot[lootbox._tpl].max); i < length; i++) {
            const reward = getRandomFromArray(rewards);
            Inventory.addItemToInventory(
                character,
                stash,
                reward,
                Item.get(reward)
            );
        }

        Inventory.removeItem(character.Inventory, characterChanges, moveAction.item);
    }
}

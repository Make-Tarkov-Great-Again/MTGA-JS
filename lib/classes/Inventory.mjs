import { database } from "../../app.mjs";

import { Item } from "./Item.mjs";
import { Character } from "./Character.mjs";
import { Trader } from "./Trader.mjs";

import { logger, stringify, cloneDeep, min } from "../utilities/_index.mjs";
import { Dialogues } from "./Dialogues.mjs";


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

    static async getInventoryItemByID(characterInventory, itemId) {
        return characterInventory.items.find(item => item._id === itemId);
    }

    static async getInventoryItemBySlotId(characterInventory, slotId) {
        return characterInventory.items.find(item => item.slotId === slotId);
    }

    static async getInventoryItemsByTpl(characterInventory, itemTpl) {
        return characterInventory.items.filter(item => item._tpl === itemTpl);
    }

    static async getInventoryItemsByParent(characterInventory, parentId) {
        return characterInventory.items.filter(item => item.parentId === parentId);
    }

    static async addItemToInventory(character, container, parentId, itemData, amountToBeAdded = 1, children = false) {
        const newItemsToBeAdded = [];

        while (amountToBeAdded > 0) {
            const containerMap = await Item.generateContainerMap(container, character.Inventory.items);

            const item = await this.createItemForPurchase(itemData, container); //this should be created outside the function
            amountToBeAdded = await this.adjustStackSize(item, itemData, amountToBeAdded);

            const itemSize = await Item.getSize(item, children);

            const freeSlot = await Item.getFreeSlot(
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
                r: freeSlot.r,
            };

            if (Item.isSearchableItem(itemData))
                item.location["isSearched"] = database.core.gameplay.items.allItemsArePreSearched;

            const preparedChildren = children ? await Item.prepareChildrenForAddItem(parentId, children) : false; //done outside
            await this.adjustItemForPurchase(newItemsToBeAdded, item, itemData, preparedChildren); //done outside
        }

        if (!newItemsToBeAdded) {
            logger.error(`[addItem] Unable to add item ${itemData._id}. Unknown cause.`);
            return false;
        }
        character.Inventory.items.push(...newItemsToBeAdded)
        return newItemsToBeAdded;
    }

    static async createItemForPurchase(itemData, container) {
        const item = await Item.createAsNewItemWithParent(itemData._id, container._id);
        const freshUpd = Item.createFreshBaseItemUpd(itemData);
        item.upd = freshUpd ? freshUpd : {};

        item.upd.SpawnedInSession = database.core.gameplay.trading.tradePurchasedIsFoundInRaid;
        return item;
    }

    static async adjustStackSize(item, itemData, itemStackToAdd) {
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

    static async adjustItemForPurchase(newItemsToBeAdded, item, itemData, children = false) {
        //this can be adjusted later if we need to separate it
        // Handle Ammoboxes //
        if (itemData._parent === ITEM_NODES.AMMO_CONTAINER) {
            if (!itemData._props.StackSlots)
                logger.warn(`[buyFromTrader] AmmoBox ${item._tpl} does not have StackSlots`)
            const ammoInAmmoBox = await Item.handleAmmoBoxes(itemData, item._id)
            newItemsToBeAdded.push(...ammoInAmmoBox);
        }

        if (children) {
            for (const child of children) {
                const childrenAdded = await this.addItemToParent(
                    item,
                    child._tpl,
                    child.slotId,
                    1,
                    child.upd,
                    child.children
                );
                newItemsToBeAdded.push(...childrenAdded);
            }
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
    static async addItemToStack(itemsMerged, stacksInInventory, itemsMaxStackSize, amountToAddToStack) {
        let remainder = amountToAddToStack;
        for (let i = stacksInInventory.length - 1; i >= 0; i--) {
            if (remainder === 0)
                return remainder;

            const inventoryItem = stacksInInventory[i];
            if (!inventoryItem.slotId == "hideout" || inventoryItem.upd.StackObjectsCount >= itemsMaxStackSize)
                continue;

            const stackToAdd = min(remainder, (itemsMaxStackSize - inventoryItem.upd.StackObjectsCount));
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
    static async addItemToParent(parent, itemId, slotId, amount = 1, customUpd = false, children = false) {
        if (!parent || !itemId || !slotId)
            return false;

        const itemTemplate = await Item.get(itemId);
        if (!itemTemplate)
            return false;

        const item = await Item.createAsNewItemWithParent(itemId, parent._id);
        item.slotId = slotId;

        if (!item.upd)
            item.upd = {};

        item.upd.StackObjectsCount = (amount > 1 && amount <= itemTemplate._props.StackMaxSize) ? amount : itemTemplate._props.StackMaxSize;

        if (customUpd)
            item.upd = customUpd;

        item.upd.SpawnedInSession = database.core.gameplay.trading.tradePurchasedIsFoundInRaid;

        const itemsAdded = [];
        if (children) {
            for (const childItem of children) {
                const childrenAdded = await this.addItemToParent(item, childItem._tpl, childItem.slotId, childItem.amount, childItem.upd, childItem.children);
                for (const childAdded of childrenAdded) {
                    itemsAdded.push(childAdded);
                }
            }
        }
        itemsAdded.push(item);
        return itemsAdded;
    }

    static async removeItem(characterInventory, characterChanges, itemId, amount = 1) {
        const item = itemId?._id
            ? await this.getInventoryItemByID(characterInventory, itemId._id)
            : await this.getInventoryItemByID(characterInventory, itemId)

        if (!item) {
            logger.error(`[removeItem] ${itemId} does not exist in character inventory`);
            return false;
        }
        const children = await Item.getParentAndChildren(item._id, characterInventory.items);
        if (children.length > 1) {
            // TODO: CHECK IF IT WORK, ADAPT OTHERWISE
            for (const child of children) {
                await this.removeInventoryItemByID(characterInventory, child._id);
                characterChanges.items.del.push(child);
            }
        }

        if (amount !== -1 && item?.upd?.StackObjectsCount && amount < item.upd.StackObjectsCount) {
            item.upd.StackObjectsCount = item.upd.StackObjectsCount - amount;
            characterChanges.items.change.push(item);
            return true;
        }
        await this.removeInventoryItemByID(characterInventory, item._id);
        characterChanges.items.del.push(item);
        logger.info(`${amount} of Item ${item._id} removed from Inventory`);
        return true;
    }

    static async moveItems(character, moveAction) {
        if (moveAction.fromOwner && moveAction.fromOwner.type === "Mail") {
            const redeemed = await Dialogues.retrieveRewardItems(character, moveAction);
            if (!redeemed)
                return;
            await this.moveItemIntoProfile(character.Inventory, moveAction, redeemed);
            return;
        }
        await this.moveItem(character.Inventory, moveAction);
    }

    static async moveItem(characterInventory, moveAction) {
        logger.warn(`Move request with params:
            Container ID: ${moveAction.to.id}
            Container Type: ${moveAction.to.container}
            Item ID: ${moveAction.item}
            Location Data: ${moveAction.to?.location ? stringify(moveAction.to.location) : "Location Unavailable"}`);

        switch (moveAction.to.container) {
            case "hideout":
                logger.warn(`Trying to move item to/in hideout`);

                const stash = await this.getStashContainer(characterInventory);
                const sortingTable = await this.getSortingTableContainer(characterInventory);

                if ([stash, sortingTable].includes(moveAction.to.id)) {
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                }
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            case "main":
                logger.warn(`Trying to move item to/in main`);
                if (await this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            case "cartridges":
                logger.warn(`Trying to move item to/in cartridges`);
                if (await this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;

            default:
                logger.warn(`Trying to move item to equipment slot ${moveAction.to.container}`);
                if (await this.getInventoryItemByID(characterInventory, moveAction.to.id))
                    return this.moveItemWithinProfile(characterInventory, moveAction);
                logger.error(`Move request failed: Invalid container with ID ${moveAction.to.id}`);
                return;
        }
    }

    static async moveItemIntoProfile(characterInventory, moveAction, rewards) {
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

    static async moveItemWithinProfile(characterInventory, moveAction) {
        if (!moveAction.item) {
            logger.error("Move request failed: No item id");
            return false;
        }

        const itemSearch = await this.getInventoryItemByID(characterInventory, moveAction.item);
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

    static async splitItem(characterInventory, characterChanges, moveAction) {
        logger.warn(`Split request with params:
            Container ID: ${moveAction.container.id}
            slot ID: ${moveAction.container.container}
            Item ID: ${moveAction.item}
            Split stack count: ${moveAction.count}
            Location Data: ${moveAction.container?.location ? stringify(moveAction.container.location) : "Location Unavailable"}`);

        const itemSearch = await this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!itemSearch) {
            logger.error(`[splitItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }
        itemSearch.upd.StackObjectsCount -= moveAction.count; // set stack being split from
        const newItem = await Item.createAsNewItemWithParent(itemSearch._tpl, moveAction.container.id);

        newItem.slotId = moveAction.container.container;
        if (moveAction.container?.location) {
            newItem.location = moveAction.container.location;
            newItem.location.r = (moveAction.container.location.r === "Vertical") ? 1 : 0;
        }

        newItem.upd = {
            StackObjectsCount: moveAction.count //set new stack
        };

        characterInventory.items.push(await cloneDeep(newItem));

        delete newItem.location;
        delete newItem.slotId;
        delete newItem.parentId;

        characterChanges.items.new.push(newItem);
    }

    static async removeInventoryItemByID(characterInventory, itemId) {
        const item = await this.getInventoryItemByID(characterInventory, itemId);
        const indexOfItem = characterInventory.items.indexOf(item);
        characterInventory.items.splice(indexOfItem, 1);
    }

    static async tagItem(characterInventory, moveAction) {
        const item = await this.getInventoryItemByID(characterInventory, moveAction.item);
        if (item) {
            if (item?.upd?.Tag) {
                item.upd.Tag.Color = moveAction.TagColor;
                item.upd.Tag.Name = moveAction.TagName;
                return;
            }

            if (typeof item.upd === "undefined")
                item.upd = {};

            if (typeof item.upd.Tag === "undefined")
                item.upd.Tag = {};

            item.upd.Tag.Color = moveAction.TagColor;
            item.upd.Tag.Name = moveAction.TagName;
            return;
        }

        logger.error(`[tagItem] Item ${moveAction.item} not found in Inventory!`);
    }

    static async mergeItem(characterInventory, characterChanges, moveAction) {
        const destinationItem = await this.getInventoryItemByID(characterInventory, moveAction.with);
        if (!destinationItem) {
            logger.error(`Merge request: couldn't find destination stack ${moveAction.with}`);
            return;
        }
        const mergedItem = moveAction?.fromOwner?.type === "Mail"
            ? await this.retrieveRewardItems(moveAction)
            : await this.getInventoryItemByID(characterInventory, moveAction.item);

        if (!mergedItem) {
            logger.error(`Merge request: couldn't find merged stack ${moveAction.item}`);
            return;
        }

        if (!mergedItem.upd)
            mergedItem["upd"] = {};
        if (!mergedItem.upd.StackObjectsCount)
            mergedItem.upd.StackObjectsCount = 1;

        destinationItem.upd.StackObjectsCount += mergedItem.upd.StackObjectsCount;
        await this.removeInventoryItemByID(characterInventory, moveAction.item);
        characterChanges.items.del.push({ _id: moveAction.item });
    }

    static async removeItems(characterInventory, moveAction) {
        const removedItems = {};
        await this.removeItem(characterInventory, moveAction.item, -1);
        Object.assign(removedItems, { _id: moveAction.item });
        return removedItems;
    }

    static async toggleItem(characterInventory, moveAction) {
        const item = await this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!item) {
            logger.error(`[toggleItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }

        if (item?.upd?.Togglable?.On) {
            item.upd.Togglable.On = moveAction.value;
            return;
        }
        if (typeof item.upd === "undefined")
            item.upd = {};
        if (typeof item.upd.Togglable === "undefined")
            item.upd.Togglable = {};

        item.upd.Togglable.On = moveAction.value;
    }

    static async bindItem(characterInventory, moveAction) {
        for (const index in characterInventory.fastPanel) {
            if (characterInventory.fastPanel[index] === moveAction.item)
                characterInventory.fastPanel[index] = "";
        }
        characterInventory.fastPanel[moveAction.index] = moveAction.item;
    }

    static async swapItem(characterInventory, moveAction) {
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

    static async foldItem(characterInventory, moveAction) {
        const item = await this.getInventoryItemByID(characterInventory, moveAction.item);
        if (!item) {
            logger.error(`[foldItem] Item ${moveAction.item} not found in Inventory!`);
            return;
        }

        if (item?.upd?.Foldable) {
            item.upd.Foldable.Folded = moveAction.value;
            return;
        }

        if (typeof item.upd === "undefined")
            item.upd = {};

        if (typeof item.upd.Foldable === "undefined")
            item.upd.Foldable = {};

        item.upd.Foldable.Folded = moveAction.value;
    }

    static async transferItem(characterInventory, moveAction) {
        let [itemFrom, itemTo] = [null, null];

        for (let i = characterInventory.items.length - 1; i > -1; i--) {
            const item = characterInventory.items[i];
            if (item._id === moveAction.item)
                itemFrom = item;
            else if (item._id === moveAction.with)
                itemTo = item;

            if (itemFrom && itemTo)
                break;
        }

        if (itemFrom && itemTo) {
            if (!itemFrom?.upd)
                Object.assign(itemFrom, { "upd": { "StackObjectsCount": 1 } });

            if (itemFrom.upd?.StackObjectsCount ? itemFrom.upd.StackObjectsCount : 1 > moveAction.count)
                itemFrom.upd.StackObjectsCount -= moveAction.count;
            else
                itemFrom.upd.StackObjectsCount -= 1;

            if (!itemTo?.upd)
                Object.assign(itemTo, { "upd": { "StackObjectsCount": 1 } });

            itemTo.upd.StackObjectsCount += moveAction.count;
        }
    }

    static async examineItem(character, moveAction) {
        logger.warn(`[examineItem] Request: ${stringify(moveAction)}`);

        let templateItem;
        switch (moveAction.fromOwner.type) {
            case "Trader":
                const trader = Trader.get(moveAction.fromOwner.id);
                const traderOffer = await Trader.getAssortItemByID(trader.assort, moveAction.item);
                if (traderOffer) {
                    templateItem = Item.get(traderOffer._tpl);
                    break;
                } else {
                    logger.error(`[examineItem] Examine Request failed: Unable to find offer for ${moveAction.item} in trader ${moveAction.fromOwner.id} `);
                    return false;
                }


            case "RagFair":
                const offer = await Ragfair.getOfferById(moveAction.fromOwner.id);
                templateItem = Item.get(offer.items[0]._tpl);
                break;

            case "HideoutUpgrade":
            case "HideoutProduction":
            case "ScavCase":
                templateItem = Item.get(moveAction.item);
                break;

            default:
                const item = await Inventory.getInventoryItemByID(character.Inventory, moveAction.item);
                if (item) {
                    templateItem = Item.get(item._tpl);
                    break;
                } else {
                    logger.error(`[examineItem] Examine Request failed: Unable to find item database template of itemId ${moveAction.item}`);
                    return false;
                }
        }


        if (templateItem) {
            if (Character.examineItem(character, templateItem._id)) {
                Character.addExperience(character, templateItem._props.ExamineExperience);
            } else {
                return logger.error(`[examineItem] Examine Request failed: Unable to examine itemId ${templateItem._id}`);
            }
        } else {
            return logger.error(`[examineItem] Examine Request failed: Unable to find item database template`);
        }
    }

    static async openRandomLootContainer(character, characterChanges, moveAction) {
        const { globals: { seasonalEvents: { loot } } } = database.core;

        const lootbox = await Inventory.getInventoryItemByID(character.Inventory, moveAction.item);
        const stash = await Inventory.getInventoryItemByID(character.Inventory, await Inventory.getStashContainer(characterInventory))
        const rewards = await Item.createWeightedList(loot[lootbox._tpl].prizes)

        for (let i = 0, length = getRandomFromArray(loot[lootbox._tpl].max); i < length; i++) {
            const reward = getRandomFromArray(rewards);
            await Inventory.addItemToInventory(
                character,
                stash,
                reward,
                Item.get(reward)
            )
        }

        await Inventory.removeItem(character.Inventory, characterChanges, moveAction.item)
    }
}

const { logger, getCurrentTimestamp } = require("../utilities");
const { BaseModel } = require("./BaseModel");
const { Customization } = require("./Index");

class Character extends BaseModel {
    constructor() {
        super();
    }

    async solve() {
        logger.logDebug("Solving Character with ID:" + this._id);
        if (this.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(this.Customization)) {
                if (typeof id === "string") {
                    this.Customization[bodyPart] = await Customization.get(id);
                }
            }
        }
    }

    async dissolve() {
        logger.logDebug("Dissolving Character with ID:" + this._id);
        const dissolvedClone = await this.clone();
        if (dissolvedClone.Customization !== undefined) {
            for (const [bodyPart, id] of Object.entries(dissolvedClone.Customization)) {
                if (typeof id === "object") {
                    dissolvedClone.Customization[bodyPart] = dissolvedClone.Customization[bodyPart]._id;
                }
            }
        }
        return dissolvedClone;
    }

    async addQuest(quest) {
        this.Quests.push({
            qid: quest._id,
            startTime: getCurrentTimestamp(),
            status: "Started"
        });
    }

    // Inventory Functionality //

    async moveItems(itemCollection) {
        let movedItems = {}
        for (const item of itemCollection) {
            let movedItem = await this.moveItem(item.to.id, item.to.container, item.item, item.to.location);
            Object.assign(movedItems, movedItem);
        }
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
                if (containerID == this.Inventory.stash) {
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

            default:
                logger.logError(`Unknown container type ${containerType}`);
                return false;
        }
    }

    async moveItemUsingSlotID(itemId, locationData, slotId, containerID) {
        if(!itemId || !locationData) {
            logger.logError("Move request failed: No itemId or locationData")
            return false;
        }

        let itemSearch = await this.getInventoryItemByID(itemId);
        if (itemSearch) {
            logger.logDebug(`Located item with item ID ${itemId}`);
            itemSearch.location = locationData;
            itemSearch.slotId = slotId;
            itemSearch.parentId = containerID;
            return itemSearch;
        }
        
        logger.logDebug(`Unable to locate item with item ID ${itemId}`);
        return false
    }

    async moveItemToHideout(itemId, locationData) {
        return this.moveItemUsingSlotID(itemId, locationData, "hideout", this.Inventory.stash);
    }

    async moveItemToMain(itemId, locationData, containerID) {
        return this.moveItemUsingSlotID(itemId, locationData, "main", containerID);
    }

    async getInventoryItemByID(itemId) {
        return this.Inventory.items.find(item => item._id == itemId);
    }

}

module.exports.Character = Character;

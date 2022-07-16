const { logger, generateItemId } = require("../utilities");
const { BaseModel } = require("./BaseModel");

class Item extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }
    
    static async bannedItems() {
        return [
            "Pockets",
            "Shrapnel",
            "QuestRaidStash",
            "QuestOfflineStash",
            "stash 10x300",
            "Standard stash 10x28",
            "Prepare for escape stash 10x48",
            "Left Behind stash 10x38",
            "Edge of darkness stash 10x68",
            "Стандартный инвентарь" //default inventory
        ];
    }

    async createAsNewItem() {
        let newItem = {};

        newItem._id = await generateItemId();
        newItem._tpl = this._id;

        return newItem;
    }

    async createAsNewItemWithParent(parentId) {
        let newItem = {};

        newItem._id = await generateItemId();
        newItem._tpl = this._id;
        newItem.parentId = parentId;

        return newItem;
    }

    /**
     * Tries to look for an item with the provided container as base, the storage location for items of the container and the item dimensions
     * @param {* item - The needle} container 
     * @param {* itemInventory - The heystack} itemInventory 
     * @param {* sizeX - The required size in X} sizeX 
     * @param {* sizeY - The required size in Y} sizeY 
     * @returns 
     */
    static async getFreeSlot(container, itemInventory, sizeX, sizeY) {
        if(!container || !itemInventory || !sizeX || !sizeY) {
            return false;
        }

        const containerTemplate = await Item.get(container._tpl);
        if(!containerTemplate) {
            return false;
        }

        //let containerMap = await Item.createContainerMap(container, itemInventory);
        //logger.logDebug(containerMap);
    }

    /**
     * Creates a used slot map for the specified grid. Requires the container and the item inventory to look for used slots.
     * @param {*} container 
     * @param {*} itemInventory 
     * @returns 
     */
    static async createContainerMap(container, itemInventory) {
        if(!container || !itemInventory) {
            return false;
        }

        const containerTemplate = await Item.get(container._tpl);
        if(!containerTemplate) {
            return false;
        }

        let items = itemInventory.filter(function (item) {
            return !!(item.parentId == container._id && item.location);
        })

        let containerMap = {} // define the container
        for(const grid of containerTemplate._props.Grids) {
            containerMap[grid._name] = {}; // define the grid
            containerMap[grid._name].height = grid._props.cellsV; // set grid height (props vertical)
            containerMap[grid._name].width = grid._props.cellsH; // set grid width (props horizontal)

            for (let row = 0; row < containerMap[grid._name].height; row++) {
                containerMap[grid._name][row] = {}; // Define this row
                for (let column = 0; column < containerMap[grid._name].width; column++) {
                    containerMap[grid._name][row][column] = null; // Set this column to null
                }
            }
        }
        
        for (const item of items) {
            const itemTemplate = await Item.get(item._tpl);
            let itemWidth;
            let itemHeight;

            // FIX for child items, specially attachments
            if (item.location.r == 0) {
                itemWidth = itemTemplate._props.Width
                itemHeight = itemTemplate._props.Height;
            } else {
                itemWidth = itemTemplate._props.Height
                itemHeight = itemTemplate._props.Width;
            }

            for (let row = item.location.y; row < (item.location.y + itemHeight); row++) { // Iterate item height in relation to inventory squares
                for (let column = item.location.x; column < (item.location.x + itemWidth); column++) { // Iterate item width in relation to inventory squares
                    if (typeof containerMap[item.slotId][row][column] !== "undefined") { // If the grid square this item occupies exists in the container
                        logger.logDebug(`Read inventory: Item ${item._id} (${itemHeight}x${itemWidth}) at ${item.parentId} slotId: ${item.slotId} R${row} C${column}`);
                        containerMap[item.slotId][row][column] = item._id; // Mark this grid square as occupied by this item
                    } else {
                        logger.logDebug(item);
                        logger.logError(`Inventory item occupies invalid slot: _id: ${item._id} _tpl: ${item._tpl} parentId: ${item.parentId} slotId: ${item.slotId} y: ${row} x: ${column} - width: ${itemWidth} height: ${itemHeight}`);
                        return [];
                    }
                }
            }
        }

        return containerMap;
    }

    static async calculateSize(item, childItems = undefined) {
        const parentItem = await Item.get(item._tpl);

        let sizeX = parentItem._props.Width,
            sizeXLeft = 0,
            sizeXRight = 0,
            sizeXForcedLeft = 0,
            sizeXForcedRight = 0;

        let sizeY = parentItem._props.Height,
            sizeYUp = 0,
            sizeYDown = 0,
            sizeYForcedUp = 0,
            sizeYForcedDown = 0;

        if(childItems) {
            for (let childItem of childItems) {
                const childItemTemplate = await Item.get(childItem._tpl);
    
                if(childItem.slotId.indexOf('mod_') < 0 ) {
                    continue;
                }
    
                // do size //
            }
        }

        let combinedSizeX = sizeX + sizeXLeft + sizeXRight + sizeXForcedLeft + sizeXForcedRight;
        let combinedSizeY = sizeY + sizeYUp + sizeYDown + sizeYForcedUp + sizeYForcedDown;

        return {
            "sizeX": combinedSizeX,
            "sizeY": combinedSizeY
        }
    }

    static async generatePriceTable(templatesItems) {
        let priceTable = {};
        for (const item of templatesItems) {
            if (item.Price === 0) continue;
            priceTable[item.Id] = item.Price;
        }
        return priceTable;
    }

    static async getItemPrice(itemId) {
        const database = require("../../engine/database");
        const priceTable = database.templates.PriceTable
        return priceTable[itemId];
    }
}

module.exports.Item = Item;
const { BaseModel } = require("./BaseModel");
const { logger, generateMongoID, readParsed, getAbsolutePathFrom } = require("../../utilities");

class Item extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    static async generateItemModel(item) {
        const { UtilityModel: { createModelFromParse } } = require("./UtilityModel");
        return createModelFromParse("Item", item);
    }

    /**
     * Check if item is foldable and folded, return true if both are true
     * @returns {Promise<Boolean>}
     */
    async isFolded() {
        return !!(this.upd && this.upd.Foldable && this.upd.Foldable.Folded === true);
    }

    /**
     * Check if item is a quest item, return true if it is
     * @returns {Promise<Boolean>}
     */
    async isQuestItem() {
        return this._props.QuestItem === true;
    }

    /**
     * Check if item is a node, return true if it is
     * @returns {Promise<Boolean>}
     */
    async isNode() {
        return this._type === "Node";
    }

    /**
     * Check if item is buyable, return true if it is
     * @returns {Promise<Boolean>}
     */
    async isUnbuyable() {
        return this._props.IsUnbuyable === true;
    }

    /**
     * Return specific property of an item
     * @param {*} property
     * @returns
     */
    async getProperty(property) {
        return this._props[property];
    }

    /**
     * Check if item is a node, is buyable and is quest item, return true if all are true
     * @returns {Promise<Boolean>}
     */
    async isBlacklisted() {
        const { database: { core: { gameplay: { trading: { flea: { removeBlacklist } } } } } } = require("../../app");
        if (await this.isNode() || await this.isUnbuyable() || await this.isQuestItem()) {
            return true;
        } else if (!this._props.CanSellOnRagfair && !removeBlacklist) {
            return true;
        } else {
            return false;
        }
    }

    async getSize(childItems = undefined) {
        let itemTemplate = this;
        if (!this._props) itemTemplate = await Item.get(this._tpl);
        let itemWidth = itemTemplate._props.Width;
        let itemHeight = itemTemplate._props.Height;
        let outWidth;
        let outHeight;
        let SizeUp = 0,
            SizeDown = 0,
            SizeLeft = 0,
            SizeRight = 0;
        let ForcedUp = 0,
            ForcedDown = 0,
            ForcedLeft = 0,
            ForcedRight = 0;

        if (childItems) {
            for (const childItem of childItems) {
                const childItemTemplate = await Item.get(childItem._tpl);

                if (childItem.slotId.indexOf('mod_') < 0) {
                    continue;
                }

                // this has to be cleaned up // 
                if (
                    (
                        itemTemplate._props.Foldable &&
                        itemTemplate._props.FoldedSlot == childItem.slotId &&
                        (await this.isFolded() || await childItem.isFolded())
                    )
                    ||
                    (
                        childItemTemplate._props.Foldable &&
                        await this.isFolded() &&
                        await childItem.isFolded()
                    )
                ) {
                    continue;
                }


                // is this even good?
                if (childItemTemplate._props.ExtraSizeForceAdd === true) {
                    ForcedUp += childItemTemplate._props.ExtraSizeUp;
                    ForcedDown += childItemTemplate._props.ExtraSizeDown;
                    ForcedLeft += childItemTemplate._props.ExtraSizeLeft;
                    ForcedRight += childItemTemplate._props.ExtraSizeRight;
                } else {
                    SizeUp = SizeUp < childItemTemplate._props.ExtraSizeUp ? childItemTemplate._props.ExtraSizeUp : SizeUp;
                    SizeDown = SizeDown < childItemTemplate._props.ExtraSizeDown ? childItemTemplate._props.ExtraSizeDown : SizeDown;
                    SizeLeft = SizeLeft < childItemTemplate._props.ExtraSizeLeft ? childItemTemplate._props.ExtraSizeLeft : SizeLeft;
                    SizeRight = SizeRight < childItemTemplate._props.ExtraSizeRight ? childItemTemplate._props.ExtraSizeRight : SizeRight;
                }
            }
        }

        itemWidth = itemWidth + SizeLeft + SizeRight + ForcedLeft + ForcedRight;
        itemHeight = itemHeight + SizeUp + SizeDown + ForcedUp + ForcedDown;

        // Rotate based on rotation variable //
        if (typeof this.location === "undefined" || this.location.r == 0) {
            outWidth = itemWidth;
            outHeight = itemHeight;
        } else {
            outWidth = itemHeight
            outHeight = itemWidth;
        }
        return { width: outWidth, height: outHeight };
    }

    /**
    * Returns children of parent as their item
    * @param {string} id 
    * @param {object} items 
    * @returns 
    */
    static async findAndReturnChildrenAsItems(itemId, items) {
        const output = [];

        for (const childItem of items) {
            if (childItem._id === itemId) {
                output.unshift(childItem);
                continue;
            }

            if (childItem.parentId === itemId && !output.find(item => childItem._id === item._id)) {
                output.push(...await this.findAndReturnChildrenAsItems(childItem._id, items));
            }
        }

        return output;
    }

    /**
     * Returns children of parent by their ID
     * @param {object} items 
     * @param {string} itemId 
     * @returns 
     */
    static async findAndReturnChildrenAsIds(itemId, items) {
        const output = [];

        for (const childitem of items) {
            if (childitem.parentId === itemId) {
                output.push(...await this.findAndReturnChildrenAsIds(childitem._id, items));
            }
        }

        output.push(itemId);
        return output;
    }

    async getAllChildItemsInInventory(itemArray) {
        if (!itemArray) {
            return false;
        }

        let parentReference = []; // Will contain parentIDs and all child objects of that parent

        for (const thisItemObj of itemArray) { // Loop through inventory items to create the parentReference object
            if (typeof thisItemObj._id != 'undefined' && typeof thisItemObj.parentId != 'undefined') {
                if (typeof parentReference[thisItemObj.parentId] == 'undefined') { // This parent hasn't yet been defined
                    parentReference[thisItemObj.parentId] = [thisItemObj]; // Add this item as the only child of this parent
                } else {
                    parentReference[thisItemObj.parentId].push(thisItemObj); // Add this item to the children of of this parent
                }
            }
        }

        if (typeof parentReference[this._id] == 'undefined') { // The input parentId has no children in the itemArray
            return false;
        } else {
            let returnArray = [...parentReference[this._id]]; // Shallow copy the initial children of the input parentId

            for (const thisChild of returnArray) {
                if (typeof parentReference[thisChild._id] != 'undefined') { // If this child ID has children defined
                    returnArray.push(...parentReference[thisChild._id]); // Add this ID's children to the returnArray, which will also be checked by further iterations of this loop
                }
            }

            return returnArray;
        }
    }

    async createAsNewItemWithParent(parentId) {
        const { UtilityModel } = require("./UtilityModel");
        const newItem = {};
        newItem._id = await generateMongoID();
        newItem._tpl = this._id;
        newItem.parentId = parentId;
        return UtilityModel.createModelFromParse("Item", newItem);
    }

    /**
     * Create a new item from this item
     * @returns {Promise<Object>}
     */
    async createAsNewItem() {
        const { UtilityModel } = require("./UtilityModel");
        const newItem = {
            _id: await generateMongoID(),
            _tpl: this._id
        };
        return UtilityModel.createModelFromParse("Item", newItem);
    }

    /**
     * Check if object is stackable
     * @returns false if it's not, size of stack otherwise
     */
    async getStackInfo() {
        if (this._props && this._props.StackMaxSize && this._props.StackMaxSize !== 1)
            return this._props.StackMaxSize;
        return false;
    }

    /**
     * Get rarity of item using his price
     * @returns {String} rarity
     */
    async getRarityByPrice() {
        const itemPrice = await Item.getItemPrice(this._id);
        if (itemPrice >= 32500) {
            return "Superrare";
        } else if (itemPrice >= 15000 && itemPrice <= 32499) {
            return "Rare";
        } else if (itemPrice > 1 && itemPrice <= 14999) {
            return "Common";
        }
    }

    /**
     * Get list of banned items
     * @returns {Promise<Array>}
     */
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

    static async checkIfTplIsMoney(tpl) {
        return [
            "5449016a4bdc2d6f028b456f", // RUB
            "5696686a4bdc2da3298b456a", // USD
            "569668774bdc2da2298b4568"  // EUR
        ].includes(tpl); // Return true if the input ID matches anything in this array, false if it doesn't
    }

    static async prepareChildrenForAddItem(parentItem, childItemArray) {
        const children = [];
        for (const childItem of childItemArray) {
            if (childItem.parentId === parentItem._id) {
                const grandchildren = await this.prepareChildrenForAddItem(childItem, childItemArray);
                const newChild = {
                    _tpl: childItem._tpl,
                    slotId: childItem.slotId
                };

                if (grandchildren) {
                    newChild.children = grandchildren;
                }

                children.push(newChild);
            }
        }

        if (children.length > 0) {
            return children;
        } else {
            return false;
        }
    }


    /**
     * Tries to look for an item with the provided container as base, the storage location for items of the container and the item dimensions
     * @param {* item - The needle} container
     * @param {* itemInventory - The heystack} itemInventory
     * @param {* itemWidth - The required size horizontally} itemWidth
     * @param {* itemHeight - The required size vertically} itemHeight
     * @returns
     * Tranks Nevermind for your help. - Bude
     */
    static async getFreeSlot(container, itemInventory, itemWidth, itemHeight) {
        if (!container || !itemInventory || !itemWidth || !itemHeight) {
            return false;
        }

        const containerTemplate = await Item.get(container._tpl);
        if (!containerTemplate) {
            return false;
        }

        const containerMap = await Item.createContainerMap(container, itemInventory);
        let freeSlot = false;
        findSlot:
        for (const grid in containerMap) {
            if (containerMap[grid].width == itemWidth && containerMap[grid].height == itemHeight) { // Check slots that are the exact size we need, horizontally
                if (containerMap[grid][0][0] != null) {
                    //logger.debug(`Exact horizontal: Occupied G${grid} R${0} C${0}`);
                    continue;
                }
                // If this loop hasn't been continued then this slot is empty. Place the item here
                //logger.debug(`Exact horizontal: Free slot found at (x${itemWidth} y${itemHeight}) at G${grid} R${0} C${0}`);

                freeSlot = { x: 0, y: 0, r: 0, slotId: grid };
                break findSlot;
            }

            if (!freeSlot) {
                if (containerMap[grid].height == itemWidth && containerMap[grid].width == itemHeight) { // Check slots that are the exact size we need, vertical
                    if (containerMap[grid][0][0] != null) {
                        //logger.debug(`Exact vertical: Occupied G${grid} R${0} C${0}`);
                        continue;
                    }
                    // If this loop hasn't been continued then this slot is empty. Place the item here
                    //logger.debug(`Exact vertical: Free slot found at (x${itemWidth} y${itemHeight}) at G${grid} R${0} C${0}`);

                    freeSlot = { x: 0, y: 0, r: 1, slotId: grid };
                    break findSlot;
                }
            }

            if (!freeSlot) { // If the item hasn't been placed, try fitting it horizontally in a grid that's larger than the size of this item
                if (containerMap[grid].width >= itemWidth && containerMap[grid].height >= itemHeight) { // Check slots that are larger than the size we need, horizontally
                    for (let row = 0; row <= (containerMap[grid].height - itemHeight); row++) {
                        columnSearch: for (let column = 0; column <= (containerMap[grid].width - itemWidth); column++) {
                            for (let searchRow = row; searchRow < (row + itemHeight); searchRow++) { // Search the surrounding squares in the shape of this item
                                for (let searchColumn = column; searchColumn < (column + itemWidth); searchColumn++) {
                                    if (containerMap[grid][searchRow][searchColumn] != null) {
                                        //logger.debug(`Larger horizontal: Occupied G${grid} R${searchRow} C${searchColumn}`);
                                        continue columnSearch; // Search the next column to the right
                                    }
                                }
                            }
                            //logger.debug(`Larger horizontal: Free slot found at (${itemHeight}x${itemWidth}) at G${grid} R${row} C${column}`);

                            freeSlot = { x: column, y: row, r: 0, slotId: grid };
                            break findSlot;
                        }
                    }
                }
            }

            if (!freeSlot) { // If the item hasn't been placed, try fitting it horizontally in a grid that's larger than the size of this item
                if (containerMap[grid].width >= itemHeight && containerMap[grid].height >= itemWidth) { // Check slots that are larger than the size we need, horizontally
                    for (let row = 0; row <= (containerMap[grid].height - itemWidth); row++) {
                        columnSearch: for (let column = 0; column <= (containerMap[grid].width - itemHeight); column++) {
                            for (let searchRow = row; searchRow < (row + itemWidth); searchRow++) { // Search the surrounding squares in the shape of this item
                                for (let searchColumn = column; searchColumn < (column + itemHeight); searchColumn++) {
                                    if (containerMap[grid][searchRow][searchColumn] != null) {
                                        //logger.debug(`Larger vertical: Occupied G${grid} R${searchRow} C${searchColumn}`);
                                        continue columnSearch; // Search the next column to the right
                                    }
                                }
                            }
                            //logger.debug(`Larger vetical: Free slot found at (${itemHeight}x${itemWidth}) at G${grid} R${row} C${column}`);

                            freeSlot = { x: column, y: row, r: 1, slotId: grid };
                            break findSlot;
                        }
                    }
                }
            }
        }

        return freeSlot
    }

    /**
     * Creates a used slot map. Requires the container and the item inventory to look for used slots.
     * @param {*} container
     * @param {*} itemInventory
     * @returns
     */
    static async createContainerMap(container, itemInventory) {
        if (!container || !itemInventory) {
            return false;
        }

        const containerTemplate = await Item.get(container._tpl);
        if (!containerTemplate) {
            return false;
        }

        const items = itemInventory.filter(function (item) {
            return !!(item.parentId === container._id && item.location);
        });

        const containerMap = {} // define the container
        for (const grid of containerTemplate._props.Grids) {
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
            logger.debug(item);
            const childItems = await item.getAllChildItemsInInventory(itemInventory);
            const itemSize = await item.getSize(childItems);

            for (let row = item.location.y; row < (item.location.y + itemSize.height); row++) { // Iterate item height in relation to inventory squares
                for (let column = item.location.x; column < (item.location.x + itemSize.width); column++) { // Iterate item width in relation to inventory squares
                    if (typeof containerMap[item.slotId][row][column] !== "undefined") { // If the grid square this item occupies exists in the container
                        //logger.debug(`Read inventory: Item ${item._id} (${itemSize.height}x${itemSize.width}) at ${item.parentId} slotId: ${item.slotId} R${row} C${column}`);
                        containerMap[item.slotId][row][column] = item._id; // Mark this grid square as occupied by this item
                    } else {
                        logger.debug(item);
                        logger.error(`Inventory item occupies invalid slot: _id: ${item._id} _tpl: ${item._tpl} parentId: ${item.parentId} slotId: ${item.slotId} y: ${row} x: ${column} - width: ${itemSize.width} height: ${itemSize.height}`);
                        return [];
                    }
                }
            }
        }

        return containerMap;
    }

    static async generatePriceTable(templatesItems) {
        const { database: { core: { gameplay: { trading: { flea: { liveFleaPrices } } } } } } = require("../../app")
        const liveFlea = readParsed(getAbsolutePathFrom("/database/liveflea.json"));

        const priceTable = {};

        for (const item of templatesItems) {

            if (liveFleaPrices && liveFlea[item.Id]) priceTable[item.Id] = liveFlea[item.Id];
            else priceTable[item.Id] = item.Price;
        }

        return priceTable;
    }

    static async getItemPrice(itemId) {
        const { database: { templates: { priceTable } } } = require('../../app');
        return priceTable[itemId];
    }

    static async createFreshBaseItemUpd(item) {
        // probably could loop through item nodes for their parents, if they exist
        // and make UPD based on that... but this is a start

        switch (item._parent) {
            case "590c745b86f7743cc433c5f2": // "Other"
                return {
                    "Resource": {
                        "Value": item._props.Resource
                    }
                };
            case "5448f3ac4bdc2dce718b4569": // Medical
                return {
                    "MedKit": {
                        "HpResource": item._props.MaxHpResource
                    }
                };
            case "5448e8d04bdc2ddf718b4569": // Food
            case "5448e8d64bdc2dce718b4568": // Drink
                return {
                    "FoodDrink": {
                        "HpPercent": item._props.MaxResource
                    }
                };
            case "5a341c4086f77401f2541505": // Headwear
            case "5448e5284bdc2dcb718b4567": // Vest
            case "5a341c4686f77469e155819e": // FaceCover
            case "5447e1d04bdc2dff2f8b4567": // Knife
            case "5448e54d4bdc2dcc718b4568": // Armor
            case "5448e5724bdc2ddf718b4568": // Visor
                return {
                    "Repairable": {
                        "MaxDurability": item._props.MaxDurability,
                        "Durability": item._props.Durability
                    }
                };
            case "55818ae44bdc2dde698b456c": // OpticScope
            case "55818ac54bdc2d5b648b456e": // IronSight
            case "55818acf4bdc2dde698b456b": // CompactCollimator
            case "55818ad54bdc2ddc698b4569": // Collimator
            case "55818add4bdc2d5b648b456f": // AssaultScope
            case "55818aeb4bdc2ddc698b456a": // SpecialScope
                return {
                    "Sight": {
                        "ScopesCurrentCalibPointIndexes": [
                            0
                        ],
                        "ScopesSelectedModes": [
                            0
                        ],
                        "SelectedScope": 0
                    }
                };
            case "5447bee84bdc2dc3278b4569": // SpecialWeapon
            case "5447bedf4bdc2d87278b4568": // GrenadeLauncher
            case "5447bed64bdc2d97278b4568": // MachineGun
            case "5447b6254bdc2dc3278b4568": // SniperRifle
            case "5447b6194bdc2d67278b4567": // MarksmanRifle
            case "5447b6094bdc2dc3278b4567": // Shotgun
            case "5447b5fc4bdc2d87278b4567": // AssaultCarbine
            case "5447b5f14bdc2d61278b4567": // AssaultRifle
            case "5447b5e04bdc2d62278b4567": // Smg
            case "617f1ef5e8b54b0998387733": // Revolver
                return {
                    "Repairable": {
                        "MaxDurability": item._props.MaxDurability,
                        "Durability": item._props.Durability
                    },
                    "Foldable": {
                        "Folded": false
                    },
                    "FireMode": {
                        "FireMode": "single"
                    }
                };
            case "5447b5cf4bdc2d65278b4567": // Pistol
                return {
                    "Repairable": {
                        "MaxDurability": item._props.MaxDurability,
                        "Durability": item._props.Durability
                    },
                    "FireMode": {
                        "FireMode": "single"
                    }
                };
            case "616eb7aea207f41933308f46": // RepairKits
                return {
                    "RepairKit": {
                        "Resource": item._props.MaxRepairResource,
                        "MaxRepairResource": item._props.MaxRepairResource
                    }
                };
            case "5485a8684bdc2da71d8b4567": // Ammo
                return {
                    "StackObjectsCount": item._props.StackMaxSize
                };

            default:
                logger.error(`Unable to create fresh UPD from parent [${item._parent}] for item [${item._id}]`);
                return "error";
        }
    }

    /**
     * Retrieve all items template that are nodes (Armor, Vest, Weapon, etc)
     * @returns {Promise<Array>} nodes
     */
    static async getAllItemsNodes() {
        const items = await Item.getAllWithoutKeys();
        const itemsNodes = [];
        for (const item of items) {
            if (await item.isNode()) {
                itemsNodes.push(item);
            }
        }
        return itemsNodes;
    }

    /**
     * Generates and returns name of chambers for bot generation
     * @returns {<Promise> []}
     */
    async generateChambersList() {
        const output = [];
        const chambers = this._props.Chambers;
        for (const chamber of chambers) {
            output.push(chamber._name);
        }
        return output;
    }

    async generateSlotsList() {
        const output = [];
        const slots = this._props.Slots;
        for (const slot of slots) {
            output.push({
                name: slot._name,
                filters: slot._props.filters[0].Filters
            })
        }
        return output;
    }

    /**
     * Retrieve all compatible magazines for this weapon
     * @param {boolean} info set to true to return max_ammo and ammo compatibility for each compatible magazine
     * @returns {Promise<Array>} list of magazine ids - false if doesn't have magazines compatibility
     */
    async generateCompatibleMagazineList(info = false) {
        const magazineSlot = this._props.Slots.find(slot => slot._name === "mod_magazine");
        if (info) {
            const output = [];
            const magazines = magazineSlot._props.filters[0].Filter;
            for (const magazine of magazines) {
                const { _props: { Cartridges } } = await Item.get(magazine);
                const info = Cartridges[0];
                output[magazine] = {
                    id: magazine,
                    count: info._max_count,
                    ammos: info._props.filters[0].Filter
                }
            }
            return output;
        } else return magazineSlot._props.filters[0].Filter;
    }

    /**
     * Retrieve all compatible ammo for this weapon
     * @returns {Promise<Array>} list of ammo ids - false if doesn't take ammo
     */
    async generateCompatibleAmmoList() {
        const { ItemNode } = require("./ItemNode");
        if (this._props?.ammoCaliber) {
            let caliber = this._props.ammoCaliber;
            if (caliber === 'Caliber9x18PMM') {
                caliber = 'Caliber9x18PM';
            }
            const allAmmoItems = await ItemNode.getNodeChildrenByName("Ammo");
            const ammoTemplates = allAmmoItems.filter(ammo => ammo._props.Caliber === caliber);
            if (ammoTemplates) {
                const res = [];
                for (const template of ammoTemplates) {
                    res.push(template._id);
                }
                return res;
            }
        }
        return false;
    }

}

module.exports.Item = Item;

import { database } from "../../app.mjs";
import { generateMongoID, logger } from "../utilities/_index.mjs";
// import db over here

export class Item {

    static get(itemID) {
        return database.items[itemID];
    }

    static getAll() {
        return database.items;
    }

    static async createWeightedList(items) {
        return this.generateWeightedList(await this.generateItemWeights(items));
    }

    static async generateItemWeights(items) {
        // retrieve all prices of items in categ
        if (!Array.isArray(items)) {
            const output = {};

            for (const c in items) {
                const category = items[c];
                output[c] = await this.generateItemsWeight(category);
            }
            return output;
        }
        return this.generateItemsWeight(items);
    }

    static async createAsNewItem(itemID) {
        const id = generateMongoID();
        return {
            _id: id,
            _tpl: itemID
        };
    }

    static async createAsNewItemWithParent(itemID, parentId) {
        const id = generateMongoID();
        return {
            _id: id,
            _tpl: itemID,
            parentId: parentId
        };
    }

    static async getParentAndChildren(itemId, items) {
        const children = [];
        for (let i = 0, length = items.length; i < length; i++) {
            const child = items[i]

            if (child._id === itemId) {
                children.unshift(child);
                continue;
            }

            if (child.parentId === itemId
                && !children.find(item => item._id === child._id))
                children.push(...await this.getParentAndChildren(child._id, items));
        }
        return children;
    }

    static async getAllChildItemsInInventory(item, items) {
        let parentReference = []; // Will contain parentIDs and all child objects of that parent

        for (let i = 0, length = items.length; i < length; i++) { // Loop through inventory items to create the parentReference object
            const thisItemObj = items[i];

            if (typeof thisItemObj._id != 'undefined' && typeof thisItemObj.parentId != 'undefined') {
                if (typeof parentReference[thisItemObj.parentId] == 'undefined') { // This parent hasn't yet been defined
                    parentReference[thisItemObj.parentId] = [thisItemObj]; // Add this item as the only child of this parent
                } else {
                    parentReference[thisItemObj.parentId].push(thisItemObj); // Add this item to the children of of this parent
                }
            }
        }

        if (typeof parentReference[item._id] == 'undefined') { // The input parentId has no children in the items
            return false;
        } else {
            let returnArray = [...parentReference[item._id]]; // Shallow copy the initial children of the input parentId

            for (const child of returnArray) {
                if (typeof parentReference[child._id] != 'undefined') { // If this child ID has children defined
                    returnArray.push(...parentReference[child._id]); // Add this ID's children to the returnArray, which will also be checked by further iterations of this loop
                }
            }

            return returnArray;
        }
    }

    /**
    * Returns children of parent by their ID
    * @param {object} items 
    * @param {string} itemId 
    * @returns 
    */
    static async findAndReturnChildrenAsIds(itemId, items) {
        const output = [];

        for (let i = 0, length = items.length; i < length; i++) {
            const child = items[i];

            if (child.parentId === itemId) {
                output.push(...await this.findAndReturnChildrenAsIds(child._id, items));
            }
        }

        output.push(itemId);
        return output;
    }

    static async prepareChildrenForAddItem(parentId, childItemArray) {
        const children = [];
        for (let i = 0, length = childItemArray.length; i < length; i++) {
            const childItem = childItemArray[i];

            if (childItem.parentId === parentId) {
                const grandchildren = await this.prepareChildrenForAddItem(childItem._id, childItemArray);
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

    static async handleAmmoBoxes(item, parentId) {
        const output = [];
        const stack = item._props.StackSlots[0];

        let remainder = stack._max_count; //ammo in box

        const ammoId = stack._props.filters[0].Filter[0];

        while (remainder > 0) {
            const cartridges = await this.createAsNewItemWithParent(ammoId, parentId);
            cartridges.slotId = stack._name;
            cartridges.upd = this.createFreshBaseItemUpd(ammoId);

            if (cartridges.upd.StackObjectsCount < remainder) {
                remainder -= cartridges.upd.StackObjectsCount;
            }
            else {
                cartridges.upd.StackObjectsCount = remainder;
                remainder -= remainder;
            }
            output.push(cartridges);
        }

        return output;
    }

    /**
     * 
     * @param {string|object} item itemID or object, will convert if ID
     * @returns {<Promise>object}
     */
    static createFreshBaseItemUpd(item) {
        if (!item?._parent) {
            item = this.get(item);
        }

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
            case "57bef4c42459772e8d35a53b": // ArmoredEquipment
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
                        "Resource": item._props.MaxRepairResource
                    }
                };
            case "5485a8684bdc2da71d8b4567": // Ammo
                return {
                    "StackObjectsCount": item._props.StackMaxSize
                };

            case "55818b084bdc2d5b648b4571": // Flashlight
            case "55818b164bdc2ddc698b456c": // TacticalCombo
                return {
                    "Light": {
                        "IsActive": false,
                        "SelectedMode": 0
                    }
                }

            case "55818a594bdc2db9688b456a": // Stock
            case "55818a104bdc2db9688b4569": // Handguard
            case "55818a684bdc2ddd698b456d": // PistolGrip
            case "555ef6e44bdc2de9068b457e": // Barrel
            case "5448bc234bdc2d3c308b4569": // Magazine
            case "55818b224bdc2dde698b456f": // Mount
            case "557596e64bdc2dc2118b4571": // Pockets
            case "5448bf274bdc2dfc2f8b456a": // MobContainer
            case "5448e53e4bdc2d60728b4567": // Backpack
            case "5645bcb74bdc2ded0b8b4578": // Headphones
            case "55818a304bdc2db5418b457d": // Reciever
            case "550aa4bf4bdc2dd6348b456b": // FlashHider
            case "550aa4cd4bdc2dd8348b456c": // Silencer
            case "55818af64bdc2d5b648b4570": // Foregrip
            case "5a74651486f7744e73386dd1": // AuxilaryMod
            case "55818afb4bdc2dde698b456d": // Bipod
            case "56ea9461d2720b67698b456f": // Gasblock
            case "550aa4dd4bdc2dc9348b4569": // MuzzleCombo
            case "55818a6f4bdc2db9688b456b": // Charge
            case "610720f290b75a49ff2e5e25": // CylinderMagazine
            case "5447e0e74bdc2d3c308b4567": // SpecItem
            case "543be6564bdc2df4348b4568": // ThrowWeap
                return false;

            default:
                logger.warn(`Unable to create fresh UPD from parent [${item._parent}] for item [${item._id}]`);
                return false;
        }
    }

    /**
    * Check if item is foldable and folded, return true if both are true
    * @param {object} item item data that houses upd
    * @returns {Promise<Boolean>}
    */
    static async isFolded(item) {
        return item?.upd?.Foldable?.Folded === true;
    }

    static isSearchableItem(item) {
        if (item._parent === "566168634bdc2d144c8b456c") return true;
        else {
            const parent = this.get(item._parent);
            return parent?._parent === "566168634bdc2d144c8b456c";
        }
    }

    /**
    * Check if object is stackable
    * @returns false if it's not, size of stack otherwise
    */
    static getStackInfo(item) {
        return item?._props?.StackMaxSize > 1 ? item._props.StackMaxSize : false
    }

    static async getSizeableItems(item, itemTemplate, items) {
        const output = [];
        for (const child of items) {
            if (child.slotId.indexOf('mod_') < 0)
                continue;

            const childItem = Item.get(child._tpl);

            const isChildFolded = await this.isFolded(child);
            const isItemFolded = await this.isFolded(item);

            if ((itemTemplate._props.Foldable
                && itemTemplate._props.FoldedSlot === child.slotId
                && (isItemFolded || isChildFolded))
                || (childItem._props.Foldable && isItemFolded && isChildFolded)) {
                continue;
            }
            output.push(child);
        }
        return output;
    }

    static async getSizesOfChildItems(children, size, forced) {
        for (const child of children) {
            const childItem = Item.get(child._tpl);

            if (childItem._props.ExtraSizeForceAdd === true) {
                forced.ForcedUp += childItem._props.ExtraSizeUp;
                forced.ForcedDown += childItem._props.ExtraSizeDown;
                forced.ForcedLeft += childItem._props.ExtraSizeLeft;
                forced.ForcedRight += childItem._props.ExtraSizeRight;
                continue;
            }

            size.SizeUp = size.SizeUp < childItem._props.ExtraSizeUp ? childItem._props.ExtraSizeUp : size.SizeUp;
            size.SizeDown = size.SizeDown < childItem._props.ExtraSizeDown ? childItem._props.ExtraSizeDown : size.SizeDown;
            size.SizeLeft = size.SizeLeft < childItem._props.ExtraSizeLeft ? childItem._props.ExtraSizeLeft : size.SizeLeft;
            size.SizeRight = size.SizeRight < childItem._props.ExtraSizeRight ? childItem._props.ExtraSizeRight : size.SizeRight;
        }
    }

    static async getSize(item, childItems = undefined) {
        const itemTemplate = Item.get(item._tpl);
        let itemWidth = itemTemplate._props.Width;
        let itemHeight = itemTemplate._props.Height;

        if (childItems) {
            const size = {
                SizeUp: 0,
                SizeDown: 0,
                SizeLeft: 0,
                SizeRight: 0
            }
            const forced = {
                ForcedUp: 0,
                ForcedDown: 0,
                ForcedLeft: 0,
                ForcedRight: 0
            }

            const sizeableItems = await this.getSizeableItems(item, itemTemplate, childItems);
            if (sizeableItems.length !== 0)
                await this.getSizesOfChildItems(sizeableItems, size, forced);

            itemWidth += (size.SizeLeft + size.SizeRight + forced.ForcedLeft + forced.ForcedRight);
            itemHeight += (size.SizeUp + size.SizeDown + forced.ForcedUp + forced.ForcedDown);
        }

        // Rotate based on rotation variable //
        if (typeof item.location === "undefined" || item.location.r === 0 || item.location.r === "Horizontal") {
            if (item?.location?.r === "Horizontal")
                logger.warn(`${item._id} has a location of ${item.location.r}`)
            return { width: itemWidth, height: itemHeight };
        } else {
            return { width: itemHeight, height: itemWidth };
        }
    }

    /**
     * Creates a used slot map. Requires the container and the item inventory to look for used slots.
     * @param {*} container
     * @param {*} itemInventory
     * @returns
     */
    static async createContainerMap(container) {
        const containerTemplate = Item.get(container._tpl);
        if (!containerTemplate) {
            logger.error(`[createContainerMap] ${container._tpl} is invalid`)
            return false;
        }

        const containerMap = {
            _id: container._id,
            map: {}
        }

        for (const grid of containerTemplate._props.Grids) {
            containerMap.map[grid._name] = { // define the grid
                height: grid._props.cellsV, // set grid height (props vertical)
                width: grid._props.cellsH // set grid width (props horizontal)
            };

            for (let row = 0, height = containerMap.map[grid._name].height; row < height; row++) {
                containerMap.map[grid._name][row] = {}; // Define this row
                for (let column = 0, width = containerMap.map[grid._name].width; column < width; column++) {
                    containerMap.map[grid._name][row][column] = null; // Set this column to null
                }
            }
        }
        return containerMap;
    }

    static async positionItemsInMap(containerMap, containerItems) {
        const items = containerItems.filter(function (item) { //return items that share the same container
            return !!(item?.parentId === containerMap._id && item?.location);
        });

        for (const item of items) {
            const itemSize = await Item.getSize(item, await Item.getAllChildItemsInInventory(item._id, containerItems))

            for (let row = item.location.y, size = (item.location.y + itemSize.height); row < size; row++) {
                // Iterate item height in relation to inventory squares
                for (let column = item.location.x, size = (item.location.x + itemSize.width); column < size; column++) {
                    // Iterate item width in relation to inventory squares
                    if (typeof containerMap.map[item.slotId][row][column] !== "undefined") {
                        // If the grid square this item occupies exists in the container
                        containerMap.map[item.slotId][row][column] = item._id;
                        // Mark this grid square as occupied by this item
                    }
                    else {
                        logger.error(`Inventory item occupies invalid slot: _id: ${item._id} _tpl: ${item._tpl} parentId: ${item.parentId} slotId: ${item.slotId} y: ${row} x: ${column} - width: ${itemSize.width} height: ${itemSize.height}`);
                        return [];
                    }
                }
            }
        }
    }

    static async generateContainerMap(container, itemInventory) {
        const containerMap = await this.createContainerMap(container);
        await this.positionItemsInMap(containerMap, itemInventory)
        return containerMap;
    }

    static async getFreeSlot(containerMap, dimensions) {

        let freeSlot = false;
        findSlot:
        for (const grid in containerMap.map) {
            // Check slots that are the exact size we need, horizontally
            if (containerMap.map[grid].width === dimensions.width && containerMap.map[grid].height === dimensions.height) {
                if (containerMap.map[grid][0][0] != null)
                    continue;

                // If this loop hasn't been continued then this slot is empty. Place the item here
                freeSlot = { x: 0, y: 0, r: 0, slotId: grid };
                break findSlot;
            }

            // Check slots that are the exact size we need, vertical
            if (containerMap.map[grid].height === dimensions.width && containerMap.map[grid].width === dimensions.height) { // Check slots that are the exact size we need, vertical
                if (containerMap.map[grid][0][0] != null)
                    continue;

                // If this loop hasn't been continued then this slot is empty. Place the item here
                freeSlot = { x: 0, y: 0, r: 1, slotId: grid };
                break findSlot;
            }


            // If the item hasn't been placed, try fitting it horizontally in a grid that's larger than the size of this item
            if (containerMap.map[grid].width >= dimensions.width && containerMap.map[grid].height >= dimensions.height) {
                // Check slots that are larger than the size we need, horizontally
                for (let row = 0, size = (containerMap.map[grid].height - dimensions.height); row <= size; row++) {
                    columnSearch: for (let column = 0, size = (containerMap.map[grid].width - dimensions.width); column <= size; column++) {
                        for (let searchRow = row, size = (row + dimensions.height); searchRow < size; searchRow++) {
                            // Search the surrounding squares in the shape of this item
                            for (let searchColumn = column, size = (column + dimensions.width); searchColumn < size; searchColumn++) {
                                if (containerMap.map[grid][searchRow][searchColumn] != null) {
                                    continue columnSearch; // Search the next column to the right
                                }
                            }
                        }
                        freeSlot = { x: column, y: row, r: 0, slotId: grid };
                        break findSlot;
                    }
                }
            }


            // If the item hasn't been placed, try fitting it horizontally in a grid that's larger than the size of this item
            if (containerMap.map[grid].width >= dimensions.height && containerMap.map[grid].height >= dimensions.width) { // Check slots that are larger than the size we need, horizontally
                for (let row = 0, size = (containerMap.map[grid].height - dimensions.width); row <= size; row++) {
                    columnSearch: for (let column = 0, size = (containerMap.map[grid].width - dimensions.height); column <= size; column++) {
                        for (let searchRow = row, size = (row + dimensions.width); searchRow < size; searchRow++) { // Search the surrounding squares in the shape of this item
                            for (let searchColumn = column, size = (column + dimensions.height); searchColumn < size; searchColumn++) {
                                if (containerMap.map[grid][searchRow][searchColumn] != null) {
                                    continue columnSearch; // Search the next column to the right
                                }
                            }
                        }
                        freeSlot = { x: column, y: row, r: 1, slotId: grid };
                        break findSlot;
                    }
                }
            }
        }
        return freeSlot;
    }

    static checkIfTplIsMoney(tpl) {
        return [
            "5449016a4bdc2d6f028b456f", // RUB
            "5696686a4bdc2da3298b456a", // USD
            "569668774bdc2da2298b4568"  // EUR
        ].includes(tpl); // Return true if the input ID matches anything in this array, false if it doesn't
    }

    static getItemPrice(itemId) {
        return database.templates.priceTable[itemId];
    }
}

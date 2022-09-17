const logger = require('./logger');
const util = require("util");
const ObjectID = require("bson-objectid");
const fs = require('fs');

const generateMongoID = async () => {
    return ObjectID.createFromTime(process.hrtime.bigint()).toHexString();
}

/**
 * Get files updated date
 * @param {string} path 
 * @returns 
 */
const getFileUpdatedDate = (path) => {
    const stats = fs.statSync(path)
    return stats.mtimeMs;
}

const getIsoDateString = async (useFormatted = false) => {
    if (useFormatted) {
        return new Date().toISOString().
            replace(/T/, ' ').
            replace(/\..+/, '');
    }
    return new Date().toISOString();
}

const utilFormat = (data) => {
    return util.format(data);
}

const clearString = (s) => {
    s.replace(/[\b]/g, '').replace(/[\f]/g, '').replace(/[\n]/g, '').replace(/[\r]/g, '').replace(/[\t]/g, '').replace(/[\\]/g, '');
}

/**
 * @returns Server uptime in seconds
 */
const getServerUptimeInSeconds = async () => {
    return ~~(process.uptime());
}
/**
 * @returns Current Date timestamp in seconds
 */
const getCurrentTimestamp = () => {
    return ~~(Date.now() / 1000);
}
/**
 * @param {Date} date 
 * @returns returns formated date to "hours-minutes-seconds" format
 */
const timeHoursMinutesSeconds = async (date) => {
    return `${("0" + date.getHours()).substr(-2)}-${("0" + date.getMinutes()).substr(-2)}-${("0" + date.getSeconds()).substr(-2)}`;
}

const getTimeDateMailFormat = async () => {
    const date = new Date();
    const hours = `0${date.getHours()}`.substr(-2);
    const minutes = `0${date.getMinutes()}`.substr(-2);
    return `${hours}:${minutes}`;
}

const getTimeMailFormat = async () => {
    const date = new Date();
    const day = `0${date.getDate()}`.substr(-2);
    const month = `0${date.getMonth() + 1}`.substr(-2);
    return `${day}.${month}.${date.getFullYear()}`;
}

/**
 * Find item object by ID in player inventory for Handover Quest, and adjust item stack as needed
 * @param {object} player 
 * @param {string} itemId 
 * @param {int} amount 
 * @param {object} output 
 * @returns
 */
const findAndChangeHandoverItemsStack = async (player, itemId, amount, output) => {
    const index = player.Inventory.items.findIndex(item => item._id === itemId);
    if (index < 0) return;
    if (amount > 0) {
        const item = player.Inventory.items[index];
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
        })
    }
}

/* all items in template with the given parent category */
const templatesWithParent = async (x) => {
    const { database: { templates: { TplLookup: { items: { byParent } } } } } = require("../app");
    return x in byParent ? byParent[x] : [];
}

const isCategory = async (x) => {
    const { database: { templates: { TplLookup: { categories: { byId } } } } } = require("../app");
    return x in byId;
}

const childrenCategories = async (x) => {
    const { database: { templates: { TplLookup: { categories: { byParent } } } } } = require("../app");
    return x in byParent ? byParent[x] : [];
}

// This bullshit handle both currency & barters
// since I'm a lazy cunt I only did currency for now :)
const payTrade = async (playerInventory, body, currency = null) => {
    if (playerInventory.items) playerInventory = playerInventory.items;

    if (body.length >= 1) {
        const moneyFiltered = playerInventory.filter((item) => {
            return item._tpl === currency;
        });
        let totalPlayerMoney = 0;
        for (const moneyItem of moneyFiltered) {
            totalPlayerMoney += !moneyItem.hasOwnProperty("upd") ? 1 : moneyItem.upd.StackObjectsCount;
        }

        let totalCost = 0;
        const getTotal = body.filter((cash) => {
            return cash.count
        })
        for (const cost of getTotal) {
            totalCost += cost.count
        }

        if (!moneyFiltered || totalPlayerMoney < totalCost) {
            logger.debug("bro you're broke, go do some runs without ai you weakling");
            return false;
        }
        for (const trade of body) {
            let price = trade.count;

            for (const moneyItem of moneyFiltered) {
                const itemAmount = !moneyItem.hasOwnProperty("upd") ? 1 : moneyItem.upd.StackObjectsCount;

                if (price >= itemAmount) {
                    price = itemAmount;
                    // TODO remove the stack from player inv
                } else {
                    if (!moneyItem.upd) {
                        // TODO remove the item from player inv
                        break;
                    } else {
                        moneyItem.upd.StackObjectsCount -= price;
                        // TODO changes output
                        break;
                    }
                }
            }
        }
        return true;
    } else {
        logger.debug("That's barter, barter not done yet, pay me Leffe and I'll do it");
        return false;
    }
}

/**
 * Remove duplicate items from array
 * @param {[]} arr 
 * @returns 
 */
const removeDuplicatesFromArray = async (arr) => {
    return [...new Set(arr)];
}

/**
 * Group array by specific object property
 * @param {[]} array 
 * @param {string} property 
 * @returns 
 */
const groupArrayByObjectProperty = async (array, property) => {
    const grouped = {};
    for (const object of array) {
        const groupName = property(object);
        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }
        grouped[groupName].push(object);
    }
    return grouped;
}

/**
 * Return true or false if two arrays contain the same values
 * @param {[]} one Array
 * @param {[]} two Array
 * @returns 
 */
const compareArrays = async (one, two) => {
    if (one.length === two.length) {
        for (const value of one) {
            if (!two.includes(value)) {
                return false;
            }
        }
        return true;
    }
    return false;
}


module.exports = {
    getCurrentTimestamp,
    getServerUptimeInSeconds,
    timeHoursMinutesSeconds,
    getTimeDateMailFormat,
    getTimeMailFormat,
    getIsoDateString,
    utilFormat,
    clearString,
    payTrade,
    findAndChangeHandoverItemsStack,
    generateMongoID,
    templatesWithParent,
    isCategory,
    childrenCategories,
    getFileUpdatedDate,
    removeDuplicatesFromArray,
    groupArrayByObjectProperty,
    compareArrays
};

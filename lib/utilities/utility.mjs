import { floor } from './math.mjs';
import { format } from "util";
import mongoid from 'mongoid-js';
import { logger } from './pino.mjs';
import { database } from "../../app.mjs";
import dns from 'dns/promises'

const checkInternet = async () => {
    return dns.lookup('google.com')
        .then(() => {
            return true;
        })
        .catch(() => {
            return false;
        });
};

const generateMongoID = () => {
    return mongoid();
}

const createLink = async (text, url) => {
    const OSC = '\u001B]';
    const BEL = '\u0007';
    const SEP = ';';
    return [
        OSC,
        '8',
        SEP,
        SEP,
        url,
        BEL,
        text,
        OSC,
        '8',
        SEP,
        SEP,
        BEL,
    ].join('');
}

const utilFormat = data => format(data);

/**
 * @returns Current Date timestamp in seconds
 */
const getCurrentTimestamp = () => floor(Date.now() / 1000);


/**
 * @param {Date} date
 * @returns returns formated date to "hours-minutes-seconds" format
 */
const timeHoursMinutesSeconds = async (date = null) => {
    if (date === null)
        date = new Date();

    return `${(date.getHours()).slice(-2)}-${(date.getMinutes()).slice(-2)}-${(date.getSeconds()).slice(-2)}`;
}

const getTimeDateMailFormat = async () => {
    const date = new Date();
    const hours = `${date.getHours()}`.slice(-2);
    const minutes = `${date.getMinutes()}`.slice(-2);
    return `${hours}:${minutes}`;
}

const getTimeMailFormat = async () => {
    const date = new Date();
    const day = `${date.getDate()}`.slice(-2);
    const month = `${date.getMonth() + 1}`.slice(-2);
    return `${day}.${month}.${date.getFullYear()}`;
}

const getModTimeFormat = () => {
    const date = new Date();
    const day = `${date.getDate()}`.slice(-2);
    const month = `${date.getMonth() + 1}`.slice(-2);
    const hours = `${date.getHours()}`.slice(-2);
    const minutes = `${date.getMinutes()}`.slice(-2);
    return `${month}/${day} @ ${hours}:${minutes}`;
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
    const byParent = database.templates.TplLookup.items.byParent;
    return x in byParent ? byParent[x] : [];
}

const isCategory = async (x) => {
    const byId = database.templates.TplLookup.categories.byId;
    return x in byId;
}

const childrenCategories = async (x) => {
    const byParent = database.templates.TplLookup.categories.byParent;
    return x in byParent ? byParent[x] : [];
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

/**
 * Shuffles array
 * @param {[]} array 
 */
const shuffleArray = async (array) => {
    for (let i = array.length - 1; i > -1; i--) {
        const j = floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}


export {
    getCurrentTimestamp,
    timeHoursMinutesSeconds,
    getTimeDateMailFormat,
    getTimeMailFormat,
    getModTimeFormat,
    utilFormat,
    findAndChangeHandoverItemsStack,
    generateMongoID,
    templatesWithParent,
    isCategory,
    childrenCategories,
    removeDuplicatesFromArray,
    groupArrayByObjectProperty,
    compareArrays,
    shuffleArray,
    createLink,
    checkInternet
};

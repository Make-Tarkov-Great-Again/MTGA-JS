
/** Generate Unique ID used in the server by using nanoid
 * @param {string} prefix 
 * @returns Unique ID as string
 */
const generateUniqueId = async (prefix = "") => {
    const { nanoid } = await import('nanoid');
    let retVal = `${prefix}-${nanoid()}`
    return retVal;
}

const getSessionID = async (request) => {
    const sessionID = request.cookies.PHPSESSID;
    if (sessionID) {
        return sessionID;
    } else {
        return false
    }
}

/**Check if the given value is undefined
 * 
 * @param {*} value definition to check
 * @returns true or false
 */
const isUndefined = async (value) => {
    return typeof value === 'undefined';
}

const getIsoDateString = async (useFormatted = false) => {
    if (useFormatted) {
        return new Date().toISOString().
            replace(/T/, ' ').
            replace(/\..+/, '');
    }
    return new Date().toISOString();
}

const utilFormat = async (data) => {
    return util.format(data);
}

const clearString = (s) => {
    s.replace(/[\b]/g, '').replace(/[\f]/g, '').replace(/[\n]/g, '').replace(/[\r]/g, '').replace(/[\t]/g, '').replace(/[\\]/g, '');
}

// Invisible in console.log
const toRawType = async (value) => {
    return Object.prototype.toString.call(value).slice(8, -1);
}

// Invisible in console.log
const forEach = async (array, iteratee) => {
    let index = -1;
    const length = array.length;
    while (++index < length) {
        iteratee(array[index], index);
    }
    return array;
}

// Invisible in console.log
const cloneSymbol = async (target) => { return Object(Symbol.prototype.valueOf.call(target)); }
// Invisible in console.log
const cloneReg = async (target) => {
    const regexFlags = /\w*$/;
    const result = new target.constructor(target.source, regexFlags.exec(target));
    result.lastIndex = target.lastIndex;
    return result;
}
// Invisible in console.log
const cloneOtherType = async (target) => {
    //const targetConstructor = target.constructor;
    switch (toRawType(target)) {
        case "Boolean":
        case "Number":
        case "String":
        case "Error":
        case "Date":
            return new target.constructor(target);
        case "RegExp":
            return cloneReg(target);
        case "Symbol":
            return cloneSymbol(target);
        case "Function":
            return target;
        default:
            return null;
    }
}
/** Deep Copy of object without keeping its references
 * 
 * @param {*} target 
 * @param {* | null} map 
 * @returns 
 */
const deepCopy = async (target, map = new WeakMap()) => {
    // clone primitive types
    if (typeof target != "object" || target == null) {
        return target;
    }
    const type = await toRawType(target);
    let cloneTarget = null;

    if (map.get(target)) {
        return map.get(target);
    }
    map.set(target, cloneTarget);

    if (type != "Set" && type != "Map" && type != "Array" && type != "Object") {
        return cloneOtherType(target)
    }

    // clone Set
    if (type == "Set") {
        cloneTarget = new Set();
        target.forEach(value => {
            cloneTarget.add(deepCopy(value, map));
        });
        return cloneTarget;
    }

    // clone Map
    if (type == "Map") {
        cloneTarget = new Map();
        target.forEach((value, key) => {
            cloneTarget.set(key, deepCopy(value, map));
        });
        return cloneTarget;
    }

    // clone Array
    if (type == "Array") {
        cloneTarget = new Array();
        await forEach(target, (value, index) => {
            cloneTarget[index] = deepCopy(value, map);
        })
    }

    // clone normal Object
    if (type == "Object") {
        cloneTarget = new Object();
        await forEach(Object.keys(target), (key, index) => {
            cloneTarget[key] = deepCopy(target[key], map);
        })
    }

    return cloneTarget;
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
const getCurrentTimestamp = async () => {
    return ~~(new Date().getTime() / 1000);
}
/**
 * @param {Date} date 
 * @returns returns formated date to "hours-minutes-seconds" format
 */
const formatTime = async (date) => {
    return `${("0" + date.getHours()).substr(-2)}-${("0" + date.getMinutes()).substr(-2)}-${("0" + date.getSeconds()).substr(-2)}`;
}

const makeSign = async (Length) => {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;

    for (let i = 0; i < Length; i++) {
        result += characters.charAt(~~(Math.random() * charactersLength));
    }

    return result;
}
module.exports = {
    generateUniqueId,
    makeSign,
    getCurrentTimestamp,
    getServerUptimeInSeconds,
    formatTime,
    deepCopy,
    getIsoDateString,
    utilFormat,
    clearString,
    toRawType,
    forEach,
    cloneSymbol,
    cloneReg,
    cloneOtherType,
    isUndefined,
    getSessionID
}
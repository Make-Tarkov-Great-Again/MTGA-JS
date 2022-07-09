const { logDebug, log } = require('./logger');

/** Generate Unique ID used in the server by using nanoid
 * @param {string} prefix 
 * @returns Unique ID as string
 */
const generateUniqueId = async (prefix = "") => {
    const { nanoid } = await import('nanoid');
    return `${prefix}-${nanoid()}`;
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

/* Find And Return Children (TRegular)
 * input: PlayerData, InitialItem._id
 * output: list of item._id
 * List is backward first item is the furthest child and last item is main item
 * returns all child items ids in array, includes itself and children
 * */


const findChildren = async (idToFind, listToSearch) => {
    let foundChildren = [];

    for (const child of listToSearch) {
        if (child.parentId !== undefined && child.parentId.includes(idToFind)) {
            foundChildren.push.apply(foundChildren, await findChildren(child._id, listToSearch));
        }

        if (child.parentId === idToFind
            || child._id === idToFind) {
            foundChildren.push(child);
        }
    }
    return foundChildren;
}

// This bullshit handle both currency & barters
// since I'm a lazy cunt I only did currency for now :)
const payTrade = async (playerInventory, body, currency=null) => {
    if (body.length === 1) {
        const moneyFiltered = playerInventory.items.filter((item) => {
            return item._tpl === currency;
        });
        let totalPlayerMoney = 0;
        for (const moneyItem of moneyFiltered) {
            totalPlayerMoney += !moneyItem.hasOwnProperty("upd") ? 1 : moneyItem.upd.StackObjectsCount;
        }

        if (!moneyFiltered || totalPlayerMoney < body[0].count) {
            logDebug("Boy you poor as fuck");
            return false;
        }

        let price = body[0].count;

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

        console.log()
    } else {
        logDebug("That's barter, barter not done yet, pay me Leffe and I'll do it");
    }
}

//const splitStack = async (item) => {
//    if (!("upd" in item) || !("StackObjectsCount" in item.upd)) {
//        return [item];
//    }
//
//    const maxStack = global._database.items[item._tpl]._props.StackMaxSize;
//    let count = item.upd.StackObjectsCount;
//    let stacks = [];
//
//    while (count) {
//        let amount = Math.min(count, maxStack);
//        let newStack = clone(item);
//
//        newStack.upd.StackObjectsCount = amount;
//        count -= amount;
//        stacks.push(newStack);
//    }
//
//    return stacks;
//}


module.exports = {
    generateUniqueId,
    makeSign,
    getCurrentTimestamp,
    getServerUptimeInSeconds,
    formatTime,
    getIsoDateString,
    utilFormat,
    clearString,
    isUndefined,
    findChildren,
    payTrade
};

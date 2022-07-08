
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
    let leads = [];

    for (const child of listToSearch) {
        if (child.parentId !== undefined
            && child.parentId.includes(idToFind)) {
            leads.push.apply(leads, findChildren(listToSearch, child._id));
        }

        if (child.parentId === idToFind || child._id === idToFind) {
            leads.push(child);
        }
    }
    return leads;
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
    findChildren
    
};

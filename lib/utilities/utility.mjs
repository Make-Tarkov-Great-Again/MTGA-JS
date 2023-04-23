import { format } from "util";
import mongoid from 'mongoid-js';
import dns from 'dns/promises'

const checkConnection = async () => {
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
const getCurrentTimestamp = () => Math.floor(Date.now() / 1000);


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


export {
    getCurrentTimestamp,
    timeHoursMinutesSeconds,
    getTimeDateMailFormat,
    getTimeMailFormat,
    getModTimeFormat,
    utilFormat,
    generateMongoID,
    createLink,
    checkConnection
};

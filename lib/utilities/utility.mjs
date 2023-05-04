import { format } from "util";
import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('1234567890abcdef', 24);

import dns from 'dns/promises'

const checkInternet = async () => {
    try {
        await Promise.race([
            dns.lookup('google.com'),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        return true;
    } catch (err) {
        return false;
    }
};


const loadModule = async (path) => import(path);

const generateMongoID = () => nanoid();

const createLink = (text, url) => `\u001B]8;;${url}\u0007${text}\u001B]8;;\u0007`;

/* const _createLink = (text, url) => {
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
} */

const utilFormat = data => format(data);

/**
 * @returns Current Date timestamp in seconds
 */
const getCurrentTimestamp = () => Math.floor(Date.now() / 1000);

/**
 * @param {Date} date
 * @returns returns formated date to "hours-minutes-seconds" format
 */
const timeHoursMinutesSeconds = (date = new Date()) => {
    const { hours, minutes, seconds } = date;
    return `${hours.toString().padStart(2, '0')}-${minutes.toString().padStart(2, '0')}-${seconds
        .toString()
        .padStart(2, '0')}`;
};

const getTimeDateMailFormat = () => {
    const date = new Date();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const getTimeMailFormat = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
};

const getModTimeFormat = () => {
    const date = new Date();
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} @ ${hours}:${minutes}`;
};

export {
    getCurrentTimestamp,
    timeHoursMinutesSeconds,
    getTimeDateMailFormat,
    getTimeMailFormat,
    getModTimeFormat,
    utilFormat,
    generateMongoID,
    createLink,
    checkInternet,
    loadModule,
};

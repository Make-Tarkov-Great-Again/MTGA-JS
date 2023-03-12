import { constants } from 'fs';
import { readFile, access, writeFile as _writeFile, stat, readdir, mkdir, unlink } from "fs/promises";
import faststring from 'fast-stringify';
import jsonFix from 'json-fixer';
//import copy from 'fast-copy';

const deleteFile = async (file, relative = false) => {
    return unlink(relative ? getAbsolutePathFrom(file) : file);
}

/**
 * Read file and parse it: async
 * @param {*} file 
 * @returns 
 */
const readParsed = async (file, relative = false) => {
    return JSON.parse(await read(relative ? getAbsolutePathFrom(file) : file));
}

const cloneDeep = async (file) => {
    return structuredClone(file);
}

const wipeDepend = (data) => {
    return JSON.parse(stringify(data));
}

/**
 * Read file async
 * @param {string} file 
 * @param {bool} encoding 
 * @returns 
 */
const read = async (file, encoding = true) => {
    return encoding ? readFile(file, "utf-8") : readFile(file);
}

/**
 * Check if file exists.
 * @param {*} filePath
 * @returns 
 */
const fileExist = async (file, relative = false) => {
    const path = (relative) ? getAbsolutePathFrom(file) : file;
    try {
        await access(path, constants.R_OK);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Convert object to string.
 * @param {*} data 
 * @param {*} oneline 
 * @returns 
 */
const stringify = (data, oneline = false) => {
    return oneline ? faststring(data) : faststring(data, null, "\t");
};

const clearString = async (s) => {
    return s.replace(/[\b]/g, '').replace(/[\f]/g, '').replace(/[\n]/g, '').replace(/[\r]/g, '').replace(/[\t]/g, '').replace(/[\\]/g, '');
}

/**
* Overwrite if file exists, else create file with content in it.
* @param {string} filePath
* @param {*} data 
* @param {boolean} relative 
*/

const writeFile = async (file, data, relative = false) => {
    const path = (relative) ? getAbsolutePathFrom(file) : file
    const repaired = await repair(data);
    return _writeFile(path, repaired, "utf8");
};

const repair = async (json) => {
    const string = stringify(json, true);
    const { data, changed } = jsonFix(string);
    if (changed) {
        const path = `../changedFiles`;
        if (!await fileExist(path)) {
            await createDirectory(path);
        }

        const text = `#bug-reports`;
        const url = `https://discord.com/channels/981198910804615250/1019747705385402403`;
        const linkTo = await createLink(text, url);

        await writeFile(`${path}/original.json`, string);
        await writeFile(`${path}/repaired.json`, stringify(data, true));

        logger.error(`JSON was repaired, follow the guidelines of ${linkTo} and supply the files written to ${path}`);
    }
    return data;
}

/**
* Retrieve absolute path using shortened path.
* @param {string} path 
* @returns {string} absolutePath
*/
const getAbsolutePathFrom = (path) => {
    const startsWithSlash = path[0] == "/";
    return startsWithSlash
        ? `${process.cwd()}${path}`
        : `${process.cwd()}/${path}`;
};

/**
 * Get files updated date
 * @param {string} path 
 * @returns 
 */
const getFileUpdatedDate = async (path) => {
    const { mtimeMs } = await stat(path);
    return mtimeMs;
}

/**
* Retrieve all directories present at a given path.
* @param {string} path 
* @returns {<Promise>Array}
*/
const getDirectoriesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    if (!await fileExist(tempPath))
        return false;

    const files = [];
    const directory = await readdir(tempPath);
    for (const filename of directory) {

        const fixedPath = tempPath.slice(-1) !== "/"
            ? `${tempPath}/${filename}`
            : `${tempPath}${filename}`;

        const stats = await stat(fixedPath);
        if (stats.isDirectory()) {
            files.push(filename);
        }
    }
    return files;
};

/**
* Retrieve all files present at a given path.
* @param {string} path 
* @returns {<Promise>Array}
*/
const getFilesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    if (!await fileExist(tempPath))
        return false;

    const files = [];
    const directory = await readdir(tempPath);
    for (const filename of directory) {

        const fixedPath = tempPath.slice(-1) !== "/"
            ? `${tempPath}/${filename}`
            : `${tempPath}${filename}`;

        const stats = await stat(fixedPath);
        if (stats.isFile()) {
            files.push(filename);
        }
    }
    return files;
};

/**
 * Creates directory at given path
 * @param {string} path 
 * @param {bool} relative 
 * @returns 
 */
const createDirectory = async (path, relative = false) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;
    return mkdir(tempPath, { recursive: true });
};

export {
    writeFile,
    repair,
    deleteFile,
    readParsed,
    read,
    fileExist,
    stringify,
    clearString,
    getFilesFrom,
    getDirectoriesFrom,
    getAbsolutePathFrom,
    wipeDepend,
    cloneDeep,
    getFileUpdatedDate,
    createDirectory
};
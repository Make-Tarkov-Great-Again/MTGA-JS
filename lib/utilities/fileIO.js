'use strict'
const fs = require('fs');
const promises = require("fs/promises");
const faststring = require('fast-stringify');
const copy = require(`fast-copy`).default;

/**
 * Read file and parse it: async
 * @param {*} file 
 * @returns 
 */
const readParsed = async (file) => {
    return parse(await promises.readFile(file, "utf8"))
}

const cloneDeep = async (file) => {
    return copy(file);
}

/**
 * Read file and parse it: sync
 */
const readParsedSync = (file) => {
    return parse(readSync(file));
}

const wipeDepend = (data) => {
    return parse(stringify(data));
}

const parse = (data) => {
    return JSON.parse(data);
}

/**
 * Read file sync
 * @param {*} file 
 * @param {*} relative 
 * @returns 
 */
const readSync = (file, relative = false) => {
    return fs.readFileSync(
        relative
            ? getAbsolutePathFrom(file)
            : file
        , 'utf8'
    );
}

/**
 * Read file async
 * @param {*} file 
 * @param {*} relative 
 * @returns 
 */
const read = async (file, relative = false) => {
    return promises.readFile(
        relative
            ? getAbsolutePathFrom(file)
            : file
        , "utf8"
    );
}

const createReadStream = (file) => { return fs.createReadStream(file); }

const createWriteStream = (file) => { return fs.createWriteStream(file, { flags: 'w' }); }


/**
 * Check if file exists.
 * @param {*} filePath
 * @returns 
 */
const fileExist = async (file, relative = false) => {
    try {
        await promises.access(
            relative
                ? getAbsolutePathFrom(file)
                : file, fs.constants.R_OK
        )
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
    return oneline 
    //? JSON.stringify(data)
    ? faststring(data) 
    //: JSON.stringify(data, null, "\t")
    : faststring(data, null, "\t");
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

const writeFile = async (file, data, relative = true) => {
    const tempPath = relative ? getAbsolutePathFrom(file) : file
    return promises.writeFile(tempPath, data, "utf8");
};

/**
* Retrieve absolute path using shortened path.
* @param {string} path 
* @returns {string} absolutePath
*/
const getAbsolutePathFrom = (path) => {
    const startsWithSlash = path[0] == "/";
    if (startsWithSlash) {
        return `${process.cwd()}${path}`;
    }
    return `${process.cwd()}/${path}`;
};

/**
* Retrieve all directories present at a given path.
* @param {string} path 
* @returns {Array}
*/
const getDirectoriesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    if (!await fileExist(tempPath))
        return false;

    const files = [];
    const directory = await promises.readdir(path);
    for (const filename of directory) {

        const fixedPath = tempPath.slice(-1) !== "/"
            ? `${tempPath}/${filename}`
            : `${tempPath}${filename}`;

        const stat = await promises.stat(fixedPath);
        if (stat.isDirectory()) {
            files.push(filename);
        }
    }
    return files;
};

/**
* Retrieve all files present at a given path.
* @param {string} path 
* @returns {Array}
*/
const getFilesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    if (!await fileExist(tempPath))
        return false;

    const files = [];
    const directory = await promises.readdir(path);
    for (const filename of directory) {

        const fixedPath = tempPath.slice(-1) !== "/"
            ? `${tempPath}/${filename}`
            : `${tempPath}${filename}`;

        const stat = await promises.stat(fixedPath);
        if (stat.isFile()) {
            files.push(filename);
        }
    }
    return files;
};

const createDirectory = async (path, relative = false) => {
    const tempPath = relative ? getAbsolutePathFrom(path) : path;
    return promises.mkdir(tempPath, { recursive: true });
};

module.exports = {
    createDirectory,
    writeFile,
    parse,
    readParsedSync,
    readParsed,
    readSync,
    read,
    fileExist,
    stringify,
    clearString,
    getFilesFrom,
    getDirectoriesFrom,
    getAbsolutePathFrom,
    createReadStream,
    createWriteStream,
    wipeDepend,
    cloneDeep
};
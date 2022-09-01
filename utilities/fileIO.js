'use strict'
const fs = require('fs');
const safeStringify = require('fast-safe-stringify');
const sjson = require('secure-json-parse')

/**
 * Read file and parse it.
 * @param {*} file 
 * @returns 
 */
const readParsed = (file) => {
    return parse(read(file));
}

const wipeDepend = (data) => {
    return parse(stringify(data));
}

const parse = (data) => {
    return sjson.parse(data);
}

const read = (file) => {
    return fs.readFileSync(file, 'utf8');
}

const createReadStream = (file) => { return fs.createReadStream(file); }

const createWriteStream = (file) => { return fs.createWriteStream(file, { flags: 'w' }); }


/**
 * Check if file exists.
 * @param {*} filePath 
 * @param {*} useRelative 
 * @returns 
 */
const fileExist = (filePath) => {
    return fs.existsSync(getAbsolutePathFrom(filePath));
}

/**
 * Convert object to string.
 * @param {*} data 
 * @param {*} oneLiner 
 * @returns 
 */
const stringify = (data, oneLiner = false) => {
    return (oneLiner) ? safeStringify(data) : safeStringify(data, null, "\t");
};

/**
* Overwrite if file exists, else create file with content in it.
* @param {string} filePath
* @param {*} data 
* @param {boolean} useRelative 
*/
const writeFile = (filePath, data, useRelative = true) => {
    fs.writeFileSync((useRelative) ? getAbsolutePathFrom(filePath) : filePath, data, { encoding: "utf8", flag: "w+" });
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
const getDirectoriesFrom = (path, useRelative = true) => {
    const tempPath = (useRelative) ? getAbsolutePathFrom(path) : path;
    return fs.readdirSync(tempPath).filter(function (file) {
        return fs.statSync(`${tempPath}/${file}`).isDirectory();
    });
};

/**
* Retrieve all files present at a given path.
* @param {string} path 
* @returns {Array}
*/
const getFilesFrom = (path, useRelative = true) => {
    const tempPath = (useRelative) ? getAbsolutePathFrom(path) : path;
    return fs.readdirSync(tempPath).filter(function (file) {
        return fs.statSync(`${tempPath}/${file}`).isFile();
    });
};

const createDirectory = (filePath) => {
    return fs.mkdirSync(getAbsolutePathFrom(filePath), { recursive: true });
};

module.exports = {
    createDirectory,
    writeFile,
    parse,
    readParsed,
    read,
    fileExist,
    stringify,
    getFilesFrom,
    getDirectoriesFrom,
    getAbsolutePathFrom,
    createReadStream,
    createWriteStream,
    wipeDepend
};
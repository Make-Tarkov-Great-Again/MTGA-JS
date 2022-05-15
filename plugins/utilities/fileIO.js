'use strict'
const fs = require('fs');

/**
 * Read file and parse it.
 * @param {*} file 
 * @returns 
 */
const readParsed = (file) => {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Check if file exists.
 * @param {*} filePath 
 * @param {*} useRelative 
 * @returns 
 */
const fileExist = (filePath, useRelative = true) => {
    return fs.existsSync(getAbsolutePathFrom(filePath, useRelative));
}

/**
 * Convert object to string.
 * @param {*} data 
 * @param {*} oneLiner 
 * @returns 
 */
const stringify = (data, oneLiner = false) => {
    return (oneLiner) ? JSON.stringify(data, null, "\t") : JSON.stringify(data);
}

/**
* Overwrite if file exists, else create file with content in it.
* @param {string} filePath
* @param {*} data 
* @param {boolean} useRelative 
*/
const writeFile = (filePath, data, useRelative = true) => {
    fs.writeFileSync((useRelative) ? getAbsolutePathFrom(filePath) : filePath, data, { encoding: "utf8", flag: "w+" });
}

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
}

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
}

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
}

module.exports = {
    writeFile,
    readParsed,
    fileExist,
    stringify,
    getFilesFrom,
    getDirectoriesFrom,
    getAbsolutePathFrom
}
import { constants } from 'fs';
import { readFile, access, writeFile, stat, readdir, mkdir, unlink } from "fs/promises";
import faststring from 'fast-stringify';
import jsonFix from 'json-fixer';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
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

const cloneDeep = (file) => {
    return { ...file };
}

const getFilepath = (path) => {
    return pathToFileURL(path);
}

const getFilename = (metaUrl) => {
    return fileURLToPath(metaUrl);
}

const getDirname = (metaUrl) => {
    return path.dirname(fileURLToPath(metaUrl));
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

const clearString = async (string) => {
    return string.replace(/[\b\f\n\r\t\\]/g, '');
    //return string.replace(/[\b]/g, '').replace(/[\f]/g, '').replace(/[\n]/g, '').replace(/[\r]/g, '').replace(/[\t]/g, '').replace(/[\\]/g, '');
}

/**
* Overwrite if file exists, else create file with content in it.
* @param {string} filePath
* @param {*} data 
* @param {boolean} relative 
*/

const write = async (file, data, relative = false) => {
    const path = (relative) ? getAbsolutePathFrom(file) : file
    const repaired = await repair(data);
    return writeFile(path, repaired, "utf8");
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

        await write(`${path}/original.json`, string);
        await write(`${path}/repaired.json`, stringify(data, true));

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
    return path[0] == "/"
        ? `${process.cwd()}${path}`
        : `${process.cwd()}/${path}`;
};

/**
 * Get files updated date
 * @param {string} path 
 * @returns 
 */
const getFileUpdatedDate = async (path) => {
    try {
        const { mtimeMs } = await stat(path);
        return mtimeMs;
    } catch (error) {
        console.error(`Error in getFileUpdatedDate for "${path}": ${error}`);
        // You can throw an error here, or return a default value, depending on your use case.
    }
};

const isDirectory = async (path) => {
    try {
        const stats = await stat(path);
        return stats.isDirectory();
    } catch (error) {
        console.error(`Error in isDirectory for "${path}": ${error}`);
        // You can throw an error here, or return a default value, depending on your use case.
    }
};


/**
* Retrieve all directories present at a given path.
* @param {string} path 
* @returns {<Promise>Array}
*/
const getDirectoriesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    try {
        if (!await fileExist(tempPath)) return false;

        const files = [];
        const directory = await readdir(tempPath);
        for (const filename of directory) {
            const fixedPath = tempPath.endsWith('/') ? `${tempPath}${filename}` : `${tempPath}/${filename}`;

            const stats = await stat(fixedPath);
            if (stats.isDirectory()) {
                files.push(filename);
            }
        }

        return files;
    } catch (error) {
        console.error(`Error in getDirectoriesFrom for "${path}": ${error}`);
        // You can throw an error here, or return a default value, depending on your use case.
    }
};


/**
* Retrieve all files present at a given path.
* @param {string} path 
* @returns {<Promise>Array}
*/
const getFilesFrom = async (path, relative = true) => {
    const tempPath = (relative) ? getAbsolutePathFrom(path) : path;

    try {
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
    }
    catch (error) {
        console.error(`Error in getFilesFrom for "${path}": ${error}`);
        // You can throw an error here, or return a default value, depending on your use case.
    }
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
    getDirname,
    getFilename,
    getFilepath,
    readdir,
    isDirectory,
    write,
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
    cloneDeep,
    getFileUpdatedDate,
    createDirectory
};
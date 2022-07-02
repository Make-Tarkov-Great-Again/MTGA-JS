'use strict';
const fs = require('fs');

// Written by Nevermind of the Altered Escape team

// debugOut simplifies writing debug information to the console
exports.debugOut = (functionInfo, text, debugLevel = 1, logType = 'info') => {
    if (Math.max(functionInfo.debugMode) >= debugLevel) {
        switch (logType) {
            case 'info':
                logger.logInfo(`\x1b[95m[AEDEBUG]\x1b[0m ${functionInfo.name} => ${text}`);
                break;

            case 'warning':
                logger.logWarning(`\x1b[95m[AEDEBUG]\x1b[0m ${functionInfo.name} => ${text}`);
                break;

            case 'error':
                logger.logError(`\x1b[95m[AEDEBUG]\x1b[0m ${functionInfo.name} => ${text}`);
                break;
        }
    }
}

// filesInDir recursively searches for files in a directory and returns an array of full paths
exports.filesInDir = (dirPath, fileFilter = false) => {
    const functionDebug = { name: 'filesInDir', debugMode: 0 }; // Debug settings for this function
    const readDir = fs.readdirSync(dirPath);

    let startFilter = false;
    let endFilter = false;

    if (fileFilter.length > 1) {
        if (fileFilter.startsWith('*')) {
            endFilter = fileFilter.slice(1);
        } else if (fileFilter.endsWith('*')) {
            startFilter = fileFilter.slice(0, -1);
        }
    }

    let fileArray = [];
    for (const thisPath of readDir) {
        if (fs.statSync(dirPath + '/' + thisPath).isDirectory()) { // If this is a directory
            this.debugOut(functionDebug, `Recursing directory: ${dirPath}/${thisPath}`, 2);
            fileArray.push(...this.filesInDir(dirPath + '/' + thisPath, fileFilter)); // Search directory recursively and add the results to the array
        } else {
            if (fileFilter) {
                const thisFileName = path.basename(thisPath);

                if (startFilter && thisFileName.startsWith(startFilter)) {
                    this.debugOut(functionDebug, `Adding filtered file: ${dirPath}/${thisPath}`, 2);
                    fileArray.push(dirPath + '/' + thisPath);
                }
                if (endFilter && thisFileName.endsWith(endFilter)) {
                    this.debugOut(functionDebug, `Adding filtered file: ${dirPath}/${thisPath}`, 2);
                    fileArray.push(dirPath + '/' + thisPath);
                }
            } else {
                this.debugOut(functionDebug, `Adding file: ${dirPath}/${thisPath}`, 2);
                fileArray.push(dirPath + '/' + thisPath); // This is a file
            }
        }
    }

    return fileArray;
}

// isDefined simplifies the process of checking if nested object properties are defined at every step of nesting without causing JS to shit the bed (this should be a default feature...)
exports.isDefined = (thisObj, thisNotation, debugOverride = 0) => {
    const functionDebug = { name: 'isDefined', debugMode: debugOverride }; // Debug settings for this function

    if (thisNotation == null) {
        const thisError = new Error().stack.split("\n")[2];
        let thisErrorLineNumber = thisError.split(":").reverse()[1];
        let thisErrorCallingFunction = thisError.split(" ")[5];

        logger.logError('===> isDefined requires two arguments <=== Called from: ' + thisErrorCallingFunction + ": " + thisErrorLineNumber);

        return false;
    }

    this.debugOut(functionDebug, `checking ${thisNotation}`, 3);
    let keyNames = [];
    if (thisNotation.includes('.')) {
        keyNames = thisNotation.split('.'); // Split into array by each key name
    } else {
        keyNames.push(thisNotation); // Push the only key name
    }

    if (keyNames.length > 0) {
        if (typeof thisObj == 'undefined') { // Check if the intial object exists
            this.debugOut(functionDebug, `Object does not exist: ${thisNotation}`, 1);
            return false;
        } else {
            let checkObj = thisObj;
            for (const thisKey of keyNames) {
                checkObj = checkObj[thisKey]; // Check subproperties

                if (typeof checkObj == 'undefined') {
                    this.debugOut(functionDebug, `Subproperty does not exist: ${thisNotation} -> ${thisKey}`, 2);
                    return false;
                }
            }

            this.debugOut(functionDebug, `Exists: ${thisNotation}`, 2);
            return true; // If we made it through the for loop without returning false, then the key must exist
        }
    } else {
        this.debugOut(functionDebug, `Invalid notation: ${thisNotation}`, 0, 'error');
        return false;
    }
}

exports.isVersionNewer = (version1, version2) => {
    let returnBool = false;
    if (version1 != version2) {
        const version1Split = version1.toString().split('.');
        const version2Split = version2.toString().split('.');
        for (let thisVersionIndex = 0; thisVersionIndex < (Math.max(version1Split.length, version2Split.length)); thisVersionIndex++) { // Iterate the number of times equal to the max number of version values
            if (version1Split[thisVersionIndex] == undefined) { // If this version lacks an equivalent value to the other version, assume it's 0; ie 2.2.0 == 2.2.0.0
                version1Split[thisVersionIndex] = 0;
            }
            if (version2Split[thisVersionIndex] == undefined) {
                version2Split[thisVersionIndex] = 0;
            }
            if (Number(version1Split[thisVersionIndex]) < Number(version2Split[thisVersionIndex])) { // Any one of the version values that's greater returns a true result
                returnBool = true;
                break;
            }
            if (version1Split[thisVersionIndex] != version2Split[thisVersionIndex]) { // If any version value isn't equal at this point, then it's lower so return a false result
                break;
            }
        }
    }
    return (returnBool);
}

exports.readParsed = (filePath) => {
    if (fs.existsSync(filePath)) { // If the file exists
        const readFile = fs.readFileSync(filePath, 'utf8'); // Read the file
        try {
            return JSON.parse(readFile); // Try to parse the file
        } catch (errorMessage) {
            logger.logError('JSON file is not formatted correctly: ' + filePath);
            const errorSplit = String(errorMessage).split(' ');
            const jsonPreviewBefore = 60;
            const jsonPreviewAfter = 50;
            if (errorSplit.length > 3) {
                const readFileString = String(readFile);
                if (errorSplit[2] == 'string' && errorSplit.length == 8) { // Missing comma
                    const errorPosition = Number(errorSplit[7]);
                    const stringStart = Math.max(errorPosition - jsonPreviewBefore, 0);
                    const stringEnd = Math.min(errorPosition + jsonPreviewAfter, readFileString.length - 1);
                    const stringBefore = readFileString.slice(stringStart, errorPosition);
                    const stringLastLineBreak = stringBefore.lastIndexOf('\n');
                    logger.logError('\x1b[41m↓ Comma is missing in this section of the JSON file ↓\x1b[0m');
                    if (stringLastLineBreak) {
                        const stringBeforeBreak = readFileString.slice(stringStart, stringStart + stringLastLineBreak);
                        const stringAfterBreak = readFileString.slice(stringStart + stringLastLineBreak, stringEnd);
                        console.info(stringBeforeBreak + '\x1b[41m,\x1b[0m' + stringAfterBreak);
                    } else {
                        const stringAfter = readFileString.slice(errorPosition, stringEnd);
                        console.info(stringBefore + '\x1b[41m,\x1b[0m' + stringAfter);
                    }
                } else if (errorSplit[2] == 'token' && errorSplit.length == 9) { // Extra character
                    const errorPosition = Number(errorSplit[8]);
                    const stringStart = Math.max(errorPosition - jsonPreviewBefore, 0);
                    const stringEnd = Math.min(errorPosition + jsonPreviewAfter, readFileString.length - 1);
                    if (errorSplit[3] == '\n' || readFileString.charAt(errorPosition - 1) == ':' || readFileString.charAt(errorPosition - 2) == ':') {
                        logger.logError('\x1b[41m↓ A quotation mark is missing in this section of the JSON file ↓\x1b[0m');
                        if (readFileString.charAt(errorPosition - 1) == ',') {
                            const stringBefore = readFileString.slice(stringStart, errorPosition - 1);
                            const stringAfter = readFileString.slice(errorPosition - 1, stringEnd);
                            console.info(stringBefore + '\x1b[41m"\x1b[0m' + stringAfter);
                        } else {
                            const stringBefore = readFileString.slice(stringStart, errorPosition);
                            const stringAfter = readFileString.slice(errorPosition, stringEnd);
                            console.info(stringBefore + '\x1b[41m"\x1b[0m' + stringAfter);
                        }
                    } else if (errorSplit[3] == '}' || errorSplit[3] == ']') { // Extra comma at the end of of an object
                        const stringBefore = readFileString.slice(stringStart, errorPosition);
                        const stringLastComma = stringBefore.lastIndexOf(',');
                        logger.logError('\x1b[41m↓ There is an extra comma in this JSON file ↓\x1b[0m');
                        if (stringLastComma) {
                            const stringBeforeComma = readFileString.slice(stringStart, stringStart + stringLastComma);
                            const stringAfterComma = readFileString.slice(stringStart + stringLastComma + 1, stringEnd);
                            console.info(stringBeforeComma + '\x1b[41m,\x1b[0m' + stringAfterComma);
                        } else {
                            const stringAfter = readFileString.slice(errorPosition + 1, stringEnd);
                            console.info(stringBefore + '\x1b[41m' + errorSplit[3] + '\x1b[0m' + stringAfter);
                        }
                    } else {
                        const stringBefore = readFileString.slice(stringStart, errorPosition);
                        const stringAfter = readFileString.slice(errorPosition + 1, stringEnd);
                        logger.logError('\x1b[41m↓ There is invalid text in this section of the JSON file ↓\x1b[0m');
                        console.info(stringBefore + '\x1b[41m' + errorSplit[3] + '\x1b[0m' + stringAfter);
                    }
                } else if (errorSplit[2] == 'end') { // Empty JSON file
                    logger.logError('\x1b[41mJSON file is empty\x1b[0m');
                }
            }
            throw errorMessage;
        }
    } else {
        logger.logError('readParsed => JSON file not found: ' + filePath);
        console.trace();
        throw '';
    }
}

exports.isValidJSON = (filePath) => {
    if (fs.existsSync(filePath)) { // If the file exists
        const readFile = fs.readFileSync(filePath, 'utf8'); // Read the file
        try {
            JSON.parse(readFile); // Try to parse the file
            return true;
        } catch (errorMessage) {
            return false;
        }
    } else {
        return false;
    }
}
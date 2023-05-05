import { logger, write, stringify } from "../utilities/_index.mjs";

import * as fs from 'fs';

import archiver from 'archiver'

/**
 * Utility for generating client scripts
 */
export class ClientScript {

    /**
     * Generate tarkov command with args
     * @param {*} tarkovPath 
     * @param {*} userAccountEmail 
     * @param {*} userAccountPassword 
     * @param {*} sessionID 
     * @param {*} ip 
     * @param {*} port 
     * @returns 
     */
    static getTarkovCommandWithArgs(tarkovPath, userAccountEmail, userAccountPassword, sessionID, ip, port) {
        return tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccountEmail + '","password":"' + userAccountPassword + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + ip + ':' + port + '","Version":"live"}';
    }


    /**
     * Copy a file to the launcher directory
     * @param {*} sourceFile 
     * @param {*} launcherDirectory 
     * @param {*} destinationName 
     * @returns 
     */
    static async copyFileToLauncherDirectory(sourceFile, launcherDirectory, destinationName) {

        // 
        // File destination.txt will be created or overwritten by default.
        let destinationPath = launcherDirectory + '/' + destinationName;
        await fs.copyFile(sourceFile, destinationPath, (err) => {
            if (err) throw err;
            logger.trace("[ClientScript] " + destinationName);
        });

        return destinationPath;

    }


    /**
     * create batch file with args
     * @param {*} launcherScriptPath 
     * @param {*} tarkovCmd 
     */
    static createTarkovScript(launcherScriptPath, tarkovCmd) {
        // create batch file with args
        write(launcherScriptPath, tarkovCmd);
    }





    /**
     * Create a ZIP archive from a directory
     * @param {*} zipFilePath : pah
     * @param {*} directory : directory to archive
     * @param {*} directoryName : directory name inside archive
     */
    static async createZip(zipFilePath, directory, directoryName) {
        // create a file to stream archive data to.
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        // listen for all archive data to be written
        // 'close' event is fired only when a file descriptor is involved
        output.on('close', function () {
            logger.trace(archive.pointer() + ' total bytes');
            logger.trace('archiver has been finalized and the output file descriptor has closed.');
        });

        // This event is fired when the data source is drained no matter what was the data source.
        // It is not part of this library but rather from the NodeJS Stream API.
        // @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function () {
            logger.trace('Data has been drained');
        });

        // good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                // throw error
                throw err;
            }
        });

        // good practice to catch this error explicitly
        archive.on('error', function (err) {
            throw err;
        });

        // pipe archive data to the file
        archive.pipe(output);


        // append files from a sub-directory and naming it `new-subdir` within the archive
        archive.directory(directory, directoryName);



        // finalize the archive (ie we are done appending files but streams have to finish yet)
        // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
        archive.finalize();
    }

    /**
     * Get base directory for zipped scripts
     * @param {*} sessionId 
     * @returns 
     */
    static getZipDirectory(sessionId) {
        return `./user/launchers-zip/${sessionId}`;

    }

    /**
     * 
     * @returns zip file name containing scripts
     */
    static getZipFileName() {
        return `mtgascripts.zip`;
    }

    /**
     * Get path of client script zip archive
     * @param {*} sessionId 
     * @returns 
     */
    static getZipFilePath(sessionId) {
        return this.getZipDirectory(sessionId) + '/' + this.getZipFileName();
    }

}

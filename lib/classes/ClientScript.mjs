import { logger, writeFile, read } from "../utilities/_index.mjs";

import * as fs from 'fs';


/**
 * Utility for generating client scripts
 */
export class ClientScript {

    /**
     * Generate tarkov command with args.
     * TODO externalize this method in another class
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
     * Generate tarkov command with args, without storing password inside script file
     * TODO externalize this method in another class
     * @param {*} tarkovPath 
     * @param {*} userAccountEmail 
     * @param {*} sessionID 
     * @param {*} ip 
     * @param {*} port 
     * @returns 
     */
    static getTarkovCommandWithoutPassword(tarkovPath, userAccountEmail, sessionID, ip, port) {
        const windowsVariableName = '%MTGA_PASSWORD%';
        return tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccountEmail + '","password":"' + windowsVariableName + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + ip + ':' + port + '","Version":"live"}';
    }

    /**
     * Read a template, and insert custom tarkov command
     * @param {*} sourceTemplateScript 
     * @param {*} destScriptPath 
     * @param {*} tarkovCmd 
     */
    static async createTarkovScriptWithoutPassword(sourceTemplateScript, destScriptPath, tarkovCmd) {

        const cmdFileContent = await read(sourceTemplateScript);
        const newFileContent = cmdFileContent.replace('EXEC_TARKOV_MTGA_COMMAND', tarkovCmd);

        // create batch file with args
        writeFile(destScriptPath, newFileContent);
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
        writeFile(launcherScriptPath, tarkovCmd);
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

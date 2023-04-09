//import { Account } from '../models/Account';
import { webinterface, database } from '../../app.mjs';
import { logger, fileExist, createDirectory } from "../utilities/_index.mjs";
import { exec, spawn } from 'child_process';
import { Account } from '../classes/Account.mjs';
import path from 'path';
import { ClientScript } from '../classes/_index.mjs';
import * as fs from 'fs';
//import { DiscordRPC } from '../classes/discord-rpc.mjs';


export class WeblauncherController {

    static async download(sessionID, reply) {

        var filePath = path.resolve(ClientScript.getZipFilePath(sessionID));
        var stat = fs.statSync(filePath);

        reply.raw.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Length': stat.size
        });

        var readStream = fs.createReadStream(filePath);


        return readStream;

    }

    /**
     * Evaulate if the client has a tarkovPath set in his account data and if not, spawn a powershell session to promt the user to select the correct folder.
     * If the path exists and a tarkov exe is found, it will spawn the tarkov client with the correct boot parameters.
     * @param {*} request
     * @param {*} reply
     */
    static async launch(sessionID, reply) {
        reply.type("text/html");

        // Make sure we're logged in.
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }

        const userAccount = Account.getWithSessionId(sessionID);
        if (!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        const tarkovPath = userAccount.tarkovPath;
        const { serverConfig } = database.core;


        // create directory structure before generating zip archive
        const launcherFilesDirectory = `./user/launchers-files/${sessionID}`;
        if (!await fileExist(launcherFilesDirectory)) {
            logger.trace('createLauncherFiles ' + launcherFilesDirectory);
            await createDirectory(launcherFilesDirectory);
        } else {
            logger.trace('createLauncherFiles exists ' + launcherFilesDirectory);
        }

        // certificate
        await ClientScript.copyFileToLauncherDirectory(`./user/certs/cert.pem`, launcherFilesDirectory, `cert.pem`);

        // script to install certificate
        await ClientScript.copyFileToLauncherDirectory(`./assets/scripts/install-certificate.ps1`, launcherFilesDirectory, `install-certificate.ps1`);

        // tarkov script
        const tarkovCmd = ClientScript.getTarkovCommandWithArgs(tarkovPath, userAccount.email, userAccount.password, sessionID, serverConfig.ip, serverConfig.port);
        const launcherScriptPath = launcherFilesDirectory + `/runTarkovMTGA.cmd`;
        ClientScript.createTarkovScript(launcherScriptPath, tarkovCmd);

        // create zip file containing certificate and Tarkov script
        const launcherZipDirectory = ClientScript.getZipDirectory(sessionID);
        const zipFilePath = ClientScript.getZipFilePath(sessionID);

        if (!await fileExist(launcherZipDirectory)) {
            logger.trace('launcherZipDirectory ' + launcherZipDirectory);
            await createDirectory(launcherZipDirectory);
        } else {
            logger.trace('launcherZipDirectory exists ' + launcherZipDirectory);
        }

        await ClientScript.createZip(zipFilePath, launcherFilesDirectory, '');

        // TODO enable download
        const zipLink = `<a href="/webinterface/weblauncher/mtgascripts">here</a>`;

        // Is the tarkovPath set within ther userAccount?
        if (!tarkovPath) {
            // The powershell script to open a select folder dialog
            const script = `
            Function Select-FolderDialog
            {
                param([string]$Description="Select Folder",[string]$RootFolder="Desktop")
                [System.Reflection.Assembly]::LoadWithPartialName("System.windows.forms") | Out-Null     
                $objForm = New-Object System.Windows.Forms.FolderBrowserDialog
                $objForm.Rootfolder = $RootFolder
                $objForm.Description = $Description
                $Show = $objForm.ShowDialog()
                If ($Show -eq "OK")
                {
                    Return $objForm.SelectedPath
                }
                Else
                {
                    Write-Error "Operation cancelled by user."
                }
            }
        
            $folder = Select-FolderDialog # the variable contains user folder selection
            write-host $folder`;

            // Spawn the powershell script as a child process
            const folderDialogue = spawn('powershell', [script]);

            // Redirect stdout and stderr to our script output.
            let scriptOutput = "";
            folderDialogue.stdout.setEncoding('utf8');
            folderDialogue.stdout.on('data', function (data) {
                data = data.toString();
                scriptOutput += data;
            });

            folderDialogue.stderr.setEncoding('utf8');
            folderDialogue.stderr.on('data', function (data) {
                data = data.toString();
                scriptOutput += data;
            });

            // Save the tarkov path if it's correct and reset.
            folderDialogue.on('close', async function (_code) {
                const newTarkovPath = scriptOutput.replace(/[\r\n]/gm, '') + "\\EscapeFromTarkov.exe";
                if (await fileExist(newTarkovPath)) {
                    userAccount.tarkovPath = newTarkovPath;
                    await Account.save(userAccount.id);

                        logger.info("[WEBINTERFACE] Launching EscapeFromTarkov.exe...");
                        exec(ClientScript.getTarkovCommandWithArgs(tarkovPath, userAccount.email, userAccount.password, sessionID, serverConfig.ip, serverConfig.port));
                        return webinterface.renderMessage("Successful", "Tarkov will start shortly.");

                }
            });

            // Render a message to give the user a headsup about what needs to be done.
            return webinterface.renderMessage("Info", `\nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT), game will start immediately!`);
        }
        // Check if the tarkovPath exists.
        if (await fileExist(tarkovPath)) {
            // Try to spawn tarkov.
            logger.info("[WEBINTERFACE] Launching EscapeFromTarkov.exe...");
            exec(tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccount.email + '","password":"' + userAccount.password + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + serverConfig.ip + ':' + serverConfig.port + '","Version":"live"}');

            return webinterface.renderMessage("Successful", `Tarkov will start shortly, click ${zipLink} to download the start up bat`);
        }
        // The tarkov executable doesn't exist
        logger.warn("[WEBINTERFACE] EscapeFromTarkov.exe does not exist");
        userAccount.tarkovPath = null;
        await Account.save(userAccount.id);
        return webinterface.renderMessage("Error", "Tarkov path was incorrect, please reset the tarkov path.");
    }
}

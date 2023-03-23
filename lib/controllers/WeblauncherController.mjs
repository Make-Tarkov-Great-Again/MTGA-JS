//import { Account } from '../models/Account';
import { webinterface, database } from '../../app.mjs';
import { logger, fileExist } from "../utilities/_index.mjs";
import { exec, spawn } from 'child_process';
import { Account } from '../classes/Account.mjs';
//import { DiscordRPC } from '../classes/discord-rpc.mjs';


export class WeblauncherController {
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

        const userAccount = await Account.getWithSessionId(sessionID);
        if (!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        const tarkovPath = userAccount.tarkovPath;
        const { serverConfig } = database.core;


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
                    exec(userAccount.tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccount.email + '","password":"' + userAccount.password + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + serverConfig.ip + ':' + serverConfig.port + '","Version":"live"}');
                    return webinterface.renderMessage("Successful", "Tarkov will start shortly.");

                }
            });

            // Render a message to give the user a headsup about what needs to be done.
            return webinterface.renderMessage("Info", `
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \n Please set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            \nPlease set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) , game will start immediately!
            `);
        } else {
            // Check if the tarkovPath exists.
            if (await fileExist(tarkovPath)) {
                // Try to spawn tarkov.
                logger.info("[WEBINTERFACE] Launching EscapeFromTarkov.exe...");
                exec(tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccount.email + '","password":"' + userAccount.password + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + serverConfig.ip + ':' + serverConfig.port + '","Version":"live"}');

                return webinterface.renderMessage("Successful", "Tarkov will start shortly.");
            } else {
                // The tarkov executable doesn't exist
                logger.warn("[WEBINTERFACE] EscapeFromTarkov.exe does not exist");
                userAccount.tarkovPath = null;
                await Account.save(userAccount.id);
                return webinterface.renderMessage("Error", "Tarkov path was incorrect, please reset the tarkov path.");
            }
        }
    }
}
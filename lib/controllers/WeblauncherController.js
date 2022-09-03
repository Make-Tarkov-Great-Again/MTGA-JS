const { Account } = require('../models/Account');
const fs = require('fs');
const { logger } = require("../../utilities");
const { webinterface } = require('../../app');
const { exec } = require('child_process');

class WeblauncherController {
    /**
     * Evaulate if the client has a tarkovPath set in his account data and if not, spawn a powershell session to promt the user to select the correct folder.
     * If the path exists and a tarkov exe is found, it will spawn the tarkov client with the correct boot parameters.
     * @param {*} request
     * @param {*} reply
     */
    static async launch(request = null, reply = null) {
        const { database: { core: { serverConfig: { ip, port } } } } = require('../../app');
        reply.type("text/html");

        // Make sure we're logged in.
        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }

        const userAccount = await Account.get(sessionID);
        if (!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        const tarkovPath = userAccount.tarkovPath;

        // Is the tarkovPath set within ther userAccount?
        if (!tarkovPath) {

            // The powershell script to open a select folder dialog
            let script = `
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
            write-host $folder`

            // Spawn the powershell script as a child process
            const spawn = require('child_process').spawn;
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
            folderDialogue.on('close', function (_code) {
                let newTarkovPath = scriptOutput.replace(/[\r\n]/gm, '') + "\\EscapeFromTarkov.exe"
                if (fs.existsSync(newTarkovPath)) {
                    userAccount.tarkovPath = newTarkovPath;
                    userAccount.save();
                }
            });

            // Render a message to give the user a headsup about what needs to be done.
            return webinterface.renderMessage("Info", "Please set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) in the dialogue box that was opened and try to start tarkov again.");
        } else {
            // Check if the tarkovPath exists.
            if (fs.existsSync(tarkovPath)) {
                // Try to spawn tarkov.
                logger.logDebug("[WEBINTERFACE]Starting tarkov...")
                exec(tarkovPath + ' -bC5vLmcuaS5u={"email":"' + userAccount.email + '","password":"' + userAccount.password + '","toggle":true,"timestamp":0} -token=' + sessionID + ' -config={"BackendUrl":"https://' + ip + ':' + port + '","Version":"live"}');
                return webinterface.renderMessage("Successful", "Tarkov will start shortly.");
            } else {
                // The tarkov executable doesn't exist
                logger.logDebug("[WEBINTERFACE] Unable to start tarkov, file does not exist.");
                userAccount.tarkovPath = null;
                userAccount.save();
                return webinterface.renderMessage("Error", "Tarkov path was incorrect, please reset the tarkov path.");
            }
        }
    }
}

module.exports.WeblauncherController = WeblauncherController;
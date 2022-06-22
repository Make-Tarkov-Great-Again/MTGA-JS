const { core } = require('../../engine/database');
const { account } = require('../models/account');
const fs = require('fs');
const { logger } = require('../utilities');
const { webinterface } = require('../../app');

class weblauncherController {
    /**
     * Evaulate if the client has a tarkovPath set in his account data and if not, spawn a powershell session to promt the user to select the correct folder.
     * If the path exists and a tarkov exe is found, it will spawn the tarkov client with the correct boot parameters.
     * @param {*} request 
     * @param {*} reply 
     */
    static launch = async (request = null, reply = null) => {
        reply.type("text/html")
        
        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }
        const userAccount = await account.get(sessionID);
        const tarkovPath = userAccount.tarkovPath;

        if (!tarkovPath) {
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

            var spawn = require('child_process').spawn;
            var folderDialogue = spawn('powershell', [script]);

            var scriptOutput = "";

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

            folderDialogue.on('close', function (code) {
                userAccount.tarkovPath = scriptOutput.replace(/[\r\n]/gm, '') + "\\EscapeFromTarkov.exe"
                userAccount.save();
            });
            return await webinterface.renderMessage("Info", "Please set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) in the dialogue box that was opened and try to start tarkov again.");
        } else {
            if (fs.existsSync(tarkovPath)) {
                logger.logDebug("[WEBINTERFACE]Starting tarkov...")
                var spawn = require('child_process').spawn;
                var tarkovGame = spawn(tarkovPath, ['-bC5vLmcuaS5u={"email":"' + userAccount.email + '","password":"' + userAccount.password + '","toggle":true,"timestamp":0}', '-token=' + sessionID, '-config={"BackendUrl":"https://' + core.serverConfig.ip + ':' + core.serverConfig.port + '","Version":"live"}']);
                return await webinterface.renderMessage("Successful", "Tarkov will start shortly.");
            } else {
                logger.logDebug("[WEBINTERFACE] Unable to start tarkov, file does not exist.");
                userAccount.tarkovPath = null;
                userAccount.save();
                return await webinterface.renderMessage("Error", "Tarkov path was incorrect, please reset the tarkov path.");
            }
        }
    }
}

module.exports.weblauncherController = weblauncherController;
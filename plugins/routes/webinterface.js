'use strict'
const logger = require('../utilities/logger');
const webInterfaceController = require('../controllers/webinterfacecontroller');
const fastJson = require('fast-json-stringify');
const fs = require('fs');

const {
    account: {
        reloadAccountByLogin,
        register,
        getEditions,
        find,
        getTarkovPath,
        setTarkovPath
    },
    database: {
        profiles,
        core
    },
    account
} = require('../../app');

const {
    fileExist,
} = require(`../utilities/fileIO`);


const checkForSessionID = (request) => {
    const sessionID = request.cookies.PHPSESSID;
    if(sessionID) {
        webInterfaceController.setSessionID(sessionID);
        logger.logDebug("[WEBINTERFACE] Found sessionID cookie: " + sessionID);
        return sessionID;
    } else {
        webInterfaceController.setSessionID(null);
    }
    
    return false;
}

const generateMessageURL = (messageHeader, messageBody) => {
    return "/message?messageHeader=" + messageHeader + "&messageBody=" + messageBody;
}


module.exports = async function webinterfaceRoutes(app, opts) {
    app.get(`/`, async (request, reply) => {
        reply.type("text/html")
        const sessionID = checkForSessionID(request);
        if(sessionID) {
            // ToDo: Add Profile Data and Extend home.html //
            return webInterfaceController.displayHomePage(await find(sessionID));
        } else {
            return webInterfaceController.displayContent("Please log into your account or register a new one.");
        }    
    })

    app.get(`/files/*`, async (request, reply) => {
        const file = request.params['*'];
        let fileExtension = String(file.split(".").at(-1)).toLowerCase();
        
        switch(fileExtension) {
            case "css":
                reply.type("text/css")
            break;
        }

        return webInterfaceController.readFile(file);
    })

    app.get(`/message`, async (request, reply) => {
        checkForSessionID(request);
        reply.type("text/html")
        return webInterfaceController.displayMessage(request.query.messageHeader, request.query.messageBody); 
    })

    // Auth //

    app.get('/webinterface/account/register', async (request, reply) => {
        reply.type("text/html")

        if(checkForSessionID(request)) {
            return webInterfaceController.displayContent("fuck off");
        } else {
            let editions = await getEditions(profiles)
            return webInterfaceController.displayRegistrationPage(editions);
        }
    })

    app.post('/webinterface/account/register', async (request, reply) => {
        if(request.body.email != (undefined || null) && request.body.password != (undefined || null) && request.body.edition != (undefined || null)) {
            const registrationInfo = {};
            registrationInfo.email = request.body.email;
            registrationInfo.password = request.body.password;
            registrationInfo.edition = request.body.edition;

            await register(registrationInfo);
            const sessionID = await reloadAccountByLogin(registrationInfo);
            if(sessionID != (undefined || null || false)) {
                logger.logDebug('[WEBINTERFACE] Registration successful for session ID: ' + sessionID);
                reply.setCookie('PHPSESSID', sessionID, {path: '/'});
                reply.redirect('/');
            } else {
                logger.logDebug('[WEBINTERFACE] Registration failed.');
                reply.redirect('/webinterface/account/register');
            }
        }

        reply.redirect('/webinterface/account/register');
    })

    app.get('/webinterface/account/login', async (request, reply) => {
        reply.type("text/html")

        if(checkForSessionID(request)) {
            return webInterfaceController.displayContent("fuck off");
        } else {
            return webInterfaceController.displayLoginPage();
        }
    })

    app.post('/webinterface/account/login', async (request, reply) => {
        if(request.body.email != (undefined || null) && request.body.password != (undefined || null)) {
            const loginInfo = {};
            loginInfo.email = request.body.email;
            loginInfo.password = request.body.password;

            const sessionID = await reloadAccountByLogin(loginInfo);
            if(sessionID != (undefined || null || false)) {
                logger.logDebug('[WEBINTERFACE] Login successful for session ID: ' + sessionID);
                reply.setCookie('PHPSESSID', sessionID, {path: '/'});
                reply.redirect('/');
            } else {
                logger.logDebug('[WEBINTERFACE] Login failed.');
                reply.redirect('/webinterface/account/login');
            }
        }

        reply.redirect('/webinterface/account/login');
    })

    app.get('/webinterface/account/logout', async (request, reply) => {
        reply.clearCookie('PHPSESSID', {path: '/'})
        reply.redirect('/');
    })

    // Launch //

    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        const sessionID = checkForSessionID(request);
        if(!sessionID) {
            reply.redirect('/webinterface/account/login');
        }
        const account = await find(sessionID);
        const tarkovPath = await getTarkovPath(sessionID);

        if(!tarkovPath) {
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
            folderDialogue.stdout.on('data', function(data) {
                data=data.toString();
                scriptOutput+=data;
            });
        
            folderDialogue.stderr.setEncoding('utf8');
            folderDialogue.stderr.on('data', function(data) {
                data=data.toString();
                scriptOutput+=data;
            });
        
            folderDialogue.on('close', function(code) {
                setTarkovPath(sessionID, scriptOutput.replace(/[\r\n]/gm, '') + "\\EscapeFromTarkov.exe");
            });
            reply.redirect(generateMessageURL("Info", "Please set the tarkov game path (NOT YOUR LIVE GAME CLIENT!!!1!!11!!elf) in the dialogue box that was opened and try to start tarkov again."));
        } else {
            if(fs.existsSync(tarkovPath)) {
                logger.logDebug("[WEBINTERFACE]Starting tarkov...")
                var spawn = require('child_process').spawn;
                var tarkovGame = spawn(tarkovPath, ['-bC5vLmcuaS5u={"email":"' + account.email + '","password":"' + account.password + '","toggle":true,"timestamp":0}', '-token=' + sessionID, '-config={"BackendUrl":"https://' + core.serverConfig.ip + ':'+core.serverConfig.port + '","Version":"live"}']);
                reply.redirect(generateMessageURL("Successfull", "Tarkov will start shortly."));
            } else {
                logger.logDebug("[WEBINTERFACE] Unable to start tarkov, file does not exist.");
                setTarkovPath(sessionID, null);
                reply.redirect(generateMessageURL("Error", "Tarkov path was incorrect, please reset the tarkov path."));
            }
        }
        
    })
}
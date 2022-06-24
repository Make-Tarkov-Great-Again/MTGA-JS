
const { editions, core } = require("../../engine/database");
const { account } = require("../models");
const { logger, generateUniqueId } = require("../utilities");
const { webinterface } = require('../../app');

class accountController {
    static test = async () => {
        return account.getBy("email", "bude");
    }

    /**
     * Display the initial homepage when accessing the web interface
     * @param {*} request 
     * @param {*} reply 
     * @returns A rendered webpage
     */
    static home = async (request = null, reply = null) => {
        reply.type("text/html")
        
        const sessionID = await webinterface.checkForSessionID(request);
        logger.logDebug(account.get(sessionID));
        if (sessionID) {
            let userAccount = await account.get(sessionID);
            if(userAccount) {
                // ToDo: Add Account Data and Extend home.html //
                let pageVariables = {
                    "version": core.serverConfig.version,
                    "username": userAccount.email
                }
                return await webinterface.renderPage("/account/home.html", pageVariables);
            }
        } else {
            return await webinterface.renderMessage("Restricted", "Login into your account or create a new one.");
        }
    }

    /**
     * Show the login page.
     * @param {*} request 
     * @param {*} reply 
     * @returns A rendered webpage
     */
    static showLogin = async (request = null, reply = null) => {
        reply.type("text/html")

        if (await webinterface.checkForSessionID(request)) {
            return await webinterface.renderMessage("Error", "Incorrect call.");
        } else {
            return await webinterface.renderPage("/account/login.html");
        }
    }
    
    /**
     * Process data from the login page.
     * @param {*} request 
     * @param {*} reply 
     * @returns 
     */
    static login = async (request = null, reply = null) => {
        if (await webinterface.checkForSessionID(request)) {
            return await webinterface.renderMessage("Error", "Incorrect call.");
        } else {
            if (request.body.email != (undefined || null) && request.body.password != (undefined || null)) {
                let userAccount = await account.getBy('email', request.body.email);
                if(userAccount) {
                    if(request.body.password == userAccount.password) {
                        reply.setCookie('PHPSESSID', userAccount.id, { path: '/' });
                        reply.redirect('/');
                    }
                }
            }
            return await webinterface.renderMessage("Error", "Incorrect username or password.");
        }
    }

    /**
     * Show the registration page and create select options for each game edition.
     * @param {*} request 
     * @param {*} reply 
     * @returns 
     */
    static create = async (request = null, reply = null) => {
        reply.type("text/html")

        if (await webinterface.checkForSessionID(request)) {
            return await webinterface.renderMessage("Error", "Incorrect call.");
        } else {
            let editionsHTML = "";

            logger.logDebug(editions);

            for (const [name, value] of Object.entries(Object.keys(editions))) {
                editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>'
            }

            let pageVariables = {
                "editions": editionsHTML
            }
            
            return await webinterface.renderPage("/account/register.html", pageVariables);
        }
    }

    /**
     * Process the data from the registration page and create a new account.
     * @param {*} request 
     * @param {*} reply 
     * @returns 
     */
    static store = async (request = null, reply = null) => {
        if (request.body.email != (undefined || null) && request.body.password != (undefined || null) && request.body.edition != (undefined || null)) {
            logger.logDebug("[CLUSTER] Registering new account...")

            let newAccountID = await generateUniqueId("AID");

            if(await account.getBy('email', request.body.email)) {
                logger.logDebug("[CLUSTER] Account already exists.")
                return await webinterface.renderMessage("Error", "The account already exists, please choose a different username.");
            }

            let newAccount = new account;
            newAccount.id = newAccountID;
            newAccount.email = request.body.email;
            newAccount.password = request.body.password;
            newAccount.wipe = true;
            newAccount.edition = request.body.edition;

            await newAccount.save();
            if (newAccount.id != (undefined || null || false)) {
                logger.logDebug('[WEBINTERFACE] Registration successful for account ID: ' + newAccount.id);
                reply.setCookie('PHPSESSID', newAccount.id, { path: '/' });
                reply.redirect('/');
            } else {
                logger.logDebug('[WEBINTERFACE] Registration failed.');
                reply.redirect('/webinterface/account/register');
            }
        }

        reply.redirect('/webinterface/account/register');
    }

    static remove = async (request = null, reply = null) => {
        
    }

    static edit = async (request = null, reply = null) => {
        reply.type("text/html")

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }

        const userAccount = await account.get(sessionID);
        if(!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        let pageVariables = {
            "tarkovPath": ((userAccount.tarkovPath) ? userAccount.tarkovPath : '')
        }

        return await webinterface.renderPage("/account/settings.html", pageVariables);
    }

    static update = async (request = null, reply = null) => {
        
    }

    static delete = async (request = null, reply = null) => {
        
    }
}

module.exports.accountController = accountController;
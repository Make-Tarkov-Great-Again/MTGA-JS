
const { profiles } = require("../../engine/database");
const { account } = require("../models/account");
const { logger } = require("../utilities");
const { generateUniqueId } = require(`../utilities/utility`);
const { webinterface } = require('../../app');

class accountController {
    static test = async () => {
        return account.getBy("email", "bude");
    }

    static home = async (request = null, reply = null) => {
        reply.type("text/html")
        const sessionID = await webinterface.checkForSessionID(request);
        if (sessionID) {
            // ToDo: Add Profile Data and Extend home.html //
            return await webinterface.displayHomePage(await account.get(sessionID));
        } else {
            return await webinterface.displayContent("Please log into your account or register a new one.");
        }
    }

    static showLogin = async (request = null, reply = null) => {
        reply.type("text/html")

        if (await webinterface.checkForSessionID(request)) {
            return webinterface.displayContent("fuck off");
        } else {
            return webinterface.displayLoginPage();
        }
    }
    
    static login = async (request = null, reply = null) => {
        if (await webinterface.checkForSessionID(request)) {
            return await webinterface.displayContent("fuck off");
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
            reply.redirect(await webinterface.generateMessageURL("Error", "Incorrect username or password."));
        }
    }

    static create = async (request = null, reply = null) => {
        reply.type("text/html")

        if (await webinterface.checkForSessionID(request)) {
            return await webinterface.displayContent("fuck off");
        } else {
            let editions = Object.keys(profiles);
            return await webinterface.displayRegistrationPage(editions);
        }
    }

    static store = async (request = null, reply = null) => {
        if (request.body.email != (undefined || null) && request.body.password != (undefined || null) && request.body.edition != (undefined || null)) {
            logger.logDebug("[CLUSTER] Registering new account...")

            let newAccountID = await generateUniqueId("AID");

            if(await account.getBy('email', request.body.email)) {
                logger.logDebug("[CLUSTER] Account already exists.")
                reply.redirect(await webinterface.generateMessageURL("Error", "The account already exists, please choose a different username."));
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

    static remove = async (id, request = null, reply = null) => {
        
    }

    static edit = async (id, request = null, reply = null) => {
        
    }

    static update = async (request = null, reply = null) => {
        
    }

    static delete = async (id, request = null, reply = null) => {
        
    }
}

module.exports.accountController = accountController;
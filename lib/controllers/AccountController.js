
const { Account } = require('../models/Account');
const { Edition } = require('../models/Edition');
const { UtilityModel } = require('../models/UtilityModel');
const { logger, generateMongoID } = require("../../utilities");
const { webinterface } = require('../../app');


class AccountController {
    static async test() {
        return Account.getBy("email", "bude");
    }

    /**
     * Display the initial homepage when accessing the web interface
     * @param {*} request 
     * @param {*} reply 
     * @returns A rendered webpage
     */
    static async home(request = null, reply = null) {
        const { database: { core: { serverConfig: { version } } } } = require('../../app');

        reply.type("text/html")
        const sessionID = await webinterface.checkForSessionID(request);
        if (sessionID) {
            let userAccount = await Account.get(sessionID);
            if (userAccount) {
                // ToDo: Add Account Data and Extend home.html //
                let pageVariables = {
                    "version": version,
                    "username": userAccount.email
                }
                return webinterface.renderPage("/account/home.html", pageVariables);
            } else {
                return webinterface.renderMessage("Restricted", "Create a account.");
            }
        }
        return webinterface.renderMessage("Restricted", "Login or create a new account.");
    }

    /**
     * Show the login page.
     * @param {*} request 
     * @param {*} reply 
     * @returns A rendered webpage
     */
    static async showLogin(request = null, reply = null) {
        reply.type("text/html");

        if (await webinterface.checkForSessionID(request)) {
            return webinterface.renderMessage("Error", "Incorrect call.");
        } else {
            return webinterface.renderPage("/account/login.html");
        }
    }

    /**
     * Process data from the login page.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async login(request = null, reply = null) {
        reply.type("text/html");
        if (await webinterface.checkForSessionID(request)) {
            return webinterface.renderMessage("Error", "Incorrect call.");
        } else {

            if (request.body.email != (undefined || null) && request.body.password != (undefined || null)) {
                logger.debug("[ACCOUNT CONTROLLER: LOGIN] " + await Account.getBy('email', request.body.email));
                const userAccount = await Account.getBy('email', request.body.email);
                if (userAccount) {
                    if (request.body.password === userAccount.password) {
                        reply.setCookie('PHPSESSID', userAccount.id, { path: '/' });
                        reply.redirect('/');
                    }
                }
            }
            return webinterface.renderMessage("Error", "Incorrect username or password.");
        }
    }

    /**
     * Show the registration page and create select options for each game edition.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async create(request = null, reply = null) {
        reply.type("text/html");

        if (await webinterface.checkForSessionID(request)) {
            return webinterface.renderMessage("Error", "Incorrect call.");
        } else {
            let editionsHTML = "";
            for (const value of Object.values(Object.keys(await Edition.getAll()))) {
                editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>'
            }

            const pageVariables = { "editions": editionsHTML };

            return webinterface.renderPage("/account/register.html", pageVariables);
        }
    }

    /**
     * Process the data from the registration page and create a new account.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async store(request = null, reply = null) {
        if (request.body.email != (undefined || null || "") && request.body.password != (undefined || null || "") && request.body.edition != (undefined || null || "")) {
            logger.debug("[CLUSTER] Registering new account...")

            const newAccountID = await generateMongoID();

            if (await Account.getBy('email', request.body.email)) {
                logger.debug("[CLUSTER] Account already exists.")
                reply.type("text/html");
                return webinterface.renderMessage("Error", "The account already exists, please choose a different username.");
            }

            const newAccount = new Account(newAccountID);
            newAccount.id = newAccountID;
            newAccount.email = request.body.email;
            newAccount.password = request.body.password;
            newAccount.wipe = true;
            newAccount.edition = await Edition.get(request.body.edition);
            newAccount.friends = {
                Friends: [],
                Ignore: [],
                InIgnoreList: []
            };
            newAccount.Matching = {
                "LookingForGroup": false
            };
            newAccount.friendRequestInbox = [];
            newAccount.friendRequestOutbox = [];

            await newAccount.save();

            if (newAccount.id !== (undefined || null || false)) {
                logger.debug('[WEBINTERFACE] Registration successful for account ID: ' + newAccount.id);
                reply.setCookie('PHPSESSID', newAccount.id, { path: '/' });
                reply.redirect('/');
            } else {
                logger.debug('[WEBINTERFACE] Registration failed.');
                reply.redirect('/webinterface/account/register');
            }
        } else {
            reply.type("text/html");
            return webinterface.renderMessage("Error", "You specified an empty accountname or password.");
        }

        reply.redirect('/webinterface/account/register');
    }

    static async logout(request = null, reply = null) {
        reply.clearCookie('PHPSESSID', { path: '/' });
        reply.redirect('/');
    }

    //static async remove(request = null, reply = null) { }

    static async edit(request = null, reply = null) {
        reply.type("text/html");

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }

        const userAccount = await Account.get(sessionID);
        if (!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        let editionsHTML = "";
        for (const value of Object.values(Object.keys(await Edition.getAll()))) {
            if (userAccount.edition.id === value) {
                editionsHTML = editionsHTML + '<option value="' + value + '" selected>' + value + '</option>'
            } else {
                editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>'
            }
        }

        const pageVariables = {
            "tarkovPath": ((userAccount.tarkovPath) ? userAccount.tarkovPath : ''),
            "editions": editionsHTML
        };

        return webinterface.renderPage("/account/settings.html", pageVariables);
    }

    static async update(request = null, reply = null) {
        reply.type("text/html");

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID) {
            reply.redirect('/webinterface/account/login');
        }

        const userAccount = await Account.get(sessionID);
        if (!userAccount) {
            reply.redirect('/webinterface/account/login');
        }

        if (request.body.password && request.body.password_retype) {
            if (request.body.password === request.body.password_retype) {
                userAccount.password = request.body.password;
            } else {
                return webinterface.renderMessage("Error", "The passwords did not match.");
            }
        }

        if (request.body.edition) {
            userAccount.edition = await Edition.get(request.body.edition);
        }

        if (request.body.wipe) {
            await UtilityModel.deleteModelWithId("Profile", sessionID);
            userAccount.wipe = true;
        }

        await userAccount.save();

        logger.debug(`[ACCOUNTCONTROLLER] update: ${userAccount}`);


        reply.redirect('/webinterface/account/settings');
    }

    async addFriendRequest(request, reply){

    }
}

module.exports.AccountController = AccountController;

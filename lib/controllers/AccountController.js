
const { Account } = require('../models/Account');
const { Edition } = require('../models/Edition');
const { UtilityModel } = require('../models/UtilityModel');
const { logger, generateMongoID } = require("../utilities");
const { webinterface, database: { core: { serverConfig: { version } } } } = require('../../app');


const ROUTES_REDIRECT = {
    HOME: '/',
    REGISTER: '/webinterface/account/register',
    LOGIN: '/webinterface/account/login',
    SETTINGS: '/webinterface/account/settings'
};

const RENDER_MESSAGES = {
    INCORRECT_CALL: 'Incorrect call.',
    INCORRECT_USERNAME_PASSWORD: 'Incorrect username or password.',
    EMPTY_USERNAME_PASSWORD: 'Empty username or password.',
    EXISTING_ACCOUNT: 'Username already taken.',
    CREATE_ACCOUNT: 'Create a account.',
    LOGIN_CREATE_ACCOUNT: 'Login or create a new account.',
    PASSWORD_MATCH: 'Password does not match.'
};

const RENDER_PAGES = {
    ACCOUNT_REGISTER: '/account/register.html',
    ACCOUNT_LOGIN: '/account/login.html',
    ACCOUNT_SETTINGS: '/account/settings.html',
    HOME: '/account/home.html'
};


class AccountController {
    /**
     * Display the initial homepage when accessing the web interface
     * @param {*} request
     * @param {*} reply
     * @returns A rendered webpage
     */
    static async home(request = null, reply = null) {
        reply.type("text/html");
        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID)
            return webinterface.renderMessage("Restricted", RENDER_MESSAGES.LOGIN_CREATE_ACCOUNT);
        const userAccount = await Account.get(sessionID);
        if (!userAccount)
            return webinterface.renderMessage("Restricted", RENDER_MESSAGES.CREATE_ACCOUNT);
        const pageVariables = {
            "version": version,
            "username": userAccount.email
        };
        return webinterface.renderPage(RENDER_PAGES.HOME, pageVariables);
    }

    /**
     * Show the login page.
     * @param {*} request
     * @param {*} reply
     * @returns A rendered webpage
     */
    static async showLogin(request = null, reply = null) {
        reply.type("text/html");

        if (await webinterface.checkForSessionID(request))
            return webinterface.renderMessage("Error", RENDER_MESSAGES.INCORRECT_CALL);
        return webinterface.renderPage(RENDER_PAGES.ACCOUNT_LOGIN);
    }

    /**
     * Process data from the login page.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async login(request = null, reply = null) {
        reply.type("text/html");
        if (await webinterface.checkForSessionID(request))
            return webinterface.renderMessage("Error", RENDER_MESSAGES.INCORRECT_CALL);

        if (request.body.email !== (undefined || null) && request.body.password !== (undefined || null)) {
            logger.debug("[ACCOUNT CONTROLLER: LOGIN] " + await Account.getBy('email', request.body.email));
            const userAccount = await Account.getBy('email', request.body.email);
            logger.debug(userAccount);
            if (userAccount && request.body.password === userAccount.password) {
                reply.setCookie('PHPSESSID', userAccount.id, { path: ROUTES_REDIRECT.HOME });
                return reply.redirect(ROUTES_REDIRECT.HOME);
            }
        }
        return webinterface.renderMessage("Error", RENDER_MESSAGES.INCORRECT_USERNAME_PASSWORD);
    }

    /**
     * Process data from the launcher login.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async launcherLogin(request = null, reply = null) {
        reply.type("application/json");
        logger.debug(request);
        if (request.body.email !== null && request.body.password !== null) {
            logger.debug("[ACCOUNT CONTROLLER: LOGIN] " + await Account.getBy('email', request.body.email));
            const userAccount = await Account.getBy('email', request.body.email);
            logger.debug(userAccount);
            if (userAccount && request.body.password === userAccount.password)
                return reply.send({ sessionID: userAccount.id });
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

        if (await webinterface.checkForSessionID(request))
            return webinterface.renderMessage("Error", RENDER_MESSAGES.INCORRECT_CALL);

        let editionsHTML = "";
        for (const value of Object.values(Object.keys(await Edition.getAll()))) {
            editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>';
        }

        const pageVariables = { "editions": editionsHTML };

        return webinterface.renderPage(RENDER_PAGES.ACCOUNT_REGISTER, pageVariables);
    }

    /**
     * Process the data from the registration page and create a new account.
     * @param {*} request
     * @param {*} reply
     * @returns
     */
    static async store(request = null, reply = null) {
        if (request.body.email !== "" && request.body.password !== "" && request.body.edition !== "") {
            logger.debug("[CLUSTER] Registering new account...");

            const newAccountID = await generateMongoID();

            if (await Account.getBy('email', request.body.email)) {
                logger.debug("[CLUSTER] Account already exists.");
                reply.type("text/html");
                return webinterface.renderMessage("Error", RENDER_MESSAGES.EXISTING_ACCOUNT);
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
                reply.setCookie('PHPSESSID', newAccount.id, { path: ROUTES_REDIRECT.HOME });
                return reply.redirect(ROUTES_REDIRECT.HOME);
            }
            logger.debug('[WEBINTERFACE] Registration failed.');
            return reply.redirect(ROUTES_REDIRECT.REGISTER);
        }
        reply.type("text/html");
        return webinterface.renderMessage("Error", RENDER_MESSAGES.EMPTY_USERNAME_PASSWORD);
    }

    static async logout(_request = null, reply = null) {
        reply.clearCookie('PHPSESSID', { path: ROUTES_REDIRECT.HOME });
        return reply.redirect(ROUTES_REDIRECT.HOME);
    }

    //static async remove(request = null, reply = null) { }

    static async edit(request = null, reply = null) {
        reply.type("text/html");

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        const userAccount = await Account.get(sessionID);
        if (!userAccount)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);


        let editionsHTML = "";
        for (const value of Object.values(Object.keys(await Edition.getAll()))) {
            if (userAccount.edition.id === value) {
                editionsHTML = editionsHTML + '<option value="' + value + '" selected>' + value + '</option>';
            } else {
                editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>';
            }
        }

        const pageVariables = {
            "tarkovPath": ((userAccount.tarkovPath) ? userAccount.tarkovPath : ''),
            "editions": editionsHTML
        };

        return webinterface.renderPage(RENDER_PAGES.ACCOUNT_SETTINGS, pageVariables);
    }

    static async update(request = null, reply = null) {
        reply.type("text/html");

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        const userAccount = await Account.get(sessionID);
        if (!userAccount)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        if (request.body.password && request.body.password_retype) {
            if (request.body.password !== request.body.password_retype)
                return webinterface.renderMessage("Error", RENDER_MESSAGES.PASSWORD_MATCH);
            userAccount.password = request.body.password;
        }

        if (request.body.edition)
            userAccount.edition = await Edition.get(request.body.edition);

        if (request.body.wipe) {
            await UtilityModel.deleteModelWithId("Profile", sessionID);
            userAccount.wipe = true;
        }

        await userAccount.save();
        logger.debug(`[ACCOUNTCONTROLLER] update: ${userAccount}`);

        return reply.redirect(ROUTES_REDIRECT.SETTINGS);
    }
}

module.exports.AccountController = AccountController;

import { logger, generateMongoID, getFilesFrom, deleteFile, fileExist } from "../utilities/_index.mjs";
import { webinterface, database } from '../../app.mjs';
import { Account, Edition } from "../classes/_index.mjs";


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
    PASSWORD_MISMATCH: 'Password does not match.',
    PASSWORD_IS_THE_SAME: 'This is the same password...',
    PAGE_UNDER_CONSTRUCTION: `Page hasn't been fully developed as of yet!`
};

const RENDER_PAGES = {
    ACCOUNT_REGISTER: '/account/register.html',
    ACCOUNT_LOGIN: '/account/login.html',
    ACCOUNT_SETTINGS: '/account/settings.html',
    HOME: '/account/home.html'
};


export class AccountController {
    /**
     * Display the initial homepage when accessing the web interface
     * @param {*} request
     * @param {*} reply
     * @returns A rendered webpage
     */
    static async home(sessionID, reply) {
        reply.type("text/html");
        
        if (!sessionID)
            return webinterface.renderMessage("Restricted", RENDER_MESSAGES.LOGIN_CREATE_ACCOUNT);
        const userAccount = database.profiles[sessionID]?.account;
        if (!userAccount)
            return webinterface.renderMessage("Restricted", RENDER_MESSAGES.CREATE_ACCOUNT);
        const pageVariables = {
            "version": database.core.serverConfig.version,
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
    static async showLogin(sessionID, reply) {
        reply.type("text/html");

        if (!sessionID)
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
            //logger.info("[ACCOUNT CONTROLLER: LOGIN]");
            const userAccount = await Account.getAccountWithEmail(request.body.email);
            //logger.warn(userAccount);
            if (userAccount && request.body.password === userAccount.password) {
                reply.setCookie('PHPSESSID', userAccount.id, { path: ROUTES_REDIRECT.HOME });
 //               DiscordRPC.OnServerLogin(userAccount.id) //Not hititng on login
                return reply.redirect(ROUTES_REDIRECT.HOME);
            } // 
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
        logger.warn(request);
        if (request.body.email !== null && request.body.password !== null) {
            logger.warn("[ACCOUNT CONTROLLER: LOGIN] " + await Account.getAccountWithEmail(request.body.email));
            const userAccount = await Account.getAccountWithEmail(request.body.email);
            logger.warn(userAccount);
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

        if (await Account.getWithSessionId(await webinterface.checkForSessionID(request)))
            return webinterface.renderMessage("Error", RENDER_MESSAGES.INCORRECT_CALL);

        let editionsHTML = "";
        for (const value of await Edition.getAllKeys()) {
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
            logger.warn("[CLUSTER] Registering new account...");

            const newAccountID = generateMongoID();
            //undefined
            if (await Account.getAccountWithEmail(request.body.email)) {
                logger.warn("[CLUSTER] Account already exists.");
                reply.type("text/html");
                return webinterface.renderMessage("Error", RENDER_MESSAGES.EXISTING_ACCOUNT);
            }
            
            await Account.create(
                 newAccountID,
                 request.body.email,
                 request.body.password,
                 request.body.edition
             );

            if (newAccountID !== (undefined || null || false)) {
                logger.warn('[WEBINTERFACE] Registration successful for account ID: ' + newAccountID);
                reply.setCookie('PHPSESSID', newAccountID, { path: ROUTES_REDIRECT.HOME });
                return reply.redirect(ROUTES_REDIRECT.HOME);
            }
            logger.warn('[WEBINTERFACE] Registration failed.');
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

    static async edit(sessionID, reply) {
        reply.type("text/html");

        
        if (!sessionID)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        const userAccount = await Account.getWithSessionId(sessionID);
        if (!userAccount)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);


        let editionsHTML = "";
        const editions = await Edition.getAllKeys();
        for (const edition of editions) {

            if (userAccount.edition === edition) {
                editionsHTML = editionsHTML + '<option value="' + edition + '" selected>' + edition + '</option>';
            }
            else {
                editionsHTML = editionsHTML + '<option value="' + edition + '">' + edition + '</option>';
            }

        }

        const pageVariables = {
            "tarkovPath": ((userAccount.tarkovPath) ? userAccount.tarkovPath : ''),
            "editions": editionsHTML
        };

        return webinterface.renderPage(RENDER_PAGES.ACCOUNT_SETTINGS, pageVariables);
    }

    static async editor(request, reply) {
        reply.type("text/html");
        return webinterface.renderMessage("Error", RENDER_MESSAGES.PAGE_UNDER_CONSTRUCTION)

    }


    static async update(request = null, reply = null) {
        reply.type("text/html");

        const sessionID = await webinterface.checkForSessionID(request);
        if (!sessionID)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        const userAccount = await Account.getWithSessionId(sessionID);
        if (!userAccount)
            return reply.redirect(ROUTES_REDIRECT.LOGIN);

        if (request.body.password && request.body.password_retype) {
            if (request.body.password !== request.body.password_retype)
                return webinterface.renderMessage("Error", RENDER_MESSAGES.PASSWORD_MISMATCH);
            if (request.body.password === userAccount.password)
                return webinterface.renderMessage("Error", RENDER_MESSAGES.PASSWORD_IS_THE_SAME);
            userAccount.password = request.body.password;
            logger.info("Account password has been sucessfully updated!");
        }

        if (userAccount.tarkovPath !== request.body.tarkovPath)
            userAccount.tarkovPath = request.body.tarkovPath;

        if (request.body.edition !== userAccount.edition)
            userAccount.edition = request.body.edition;

        if (request.body.wipe) {
            const accountPath = await Account.getAccountDirectory(sessionID);
            const accountDirectory = await getFilesFrom(accountPath);
            if (accountDirectory.length === 0) {
                logger.warn("There is no account to wipe....");
                return reply.redirect(ROUTES_REDIRECT.SETTINGS);
            }
            for (const index of accountDirectory) {
                const name = index.replace(".json", "");
                if (["character", "storage", "special", "dialogues"].includes(name)) {
                    const filePath = `${accountPath}/${index}`;
                    if (await fileExist(filePath, true))
                        await deleteFile(filePath, true);
                }
            }
            if (database.profiles[sessionID]) {
                for (const file of ["character", "storage", "special", "dialogues"]) {
                    if (!database.profiles[sessionID][file]) continue;
                    delete database.profiles[sessionID][file];
                    logger.info(`Profile for Account ${sessionID} has been successfully wiped!`);
                }
            }
        }

        await Account.save(userAccount.id);
        return reply.redirect(ROUTES_REDIRECT.SETTINGS);
    }
}

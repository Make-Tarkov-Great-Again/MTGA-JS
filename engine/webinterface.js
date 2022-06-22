const { logger, read } = require("../plugins/utilities");
const database = require("./database");

/**
 * The webInterfaceController handles the parsing of templates.
 * Can be optimized.
 */
class webInterface {
    constructor() {
        this.sessionID = null;
        this.privateNavigation = {
            "Start Tarkov": "/webinterface/weblauncher/start",
            "Settings": "/webinterface/account/settings"
        }
        this.baseDirectory = "./templates/webinterface";
        logger.logDebug("[WEBINTERFACE] Constructed.")
    }

    // Auth //
    async setSessionID(sessionID) {
        this.sessionID = sessionID;
    }

    async getSessionID() {
        return this.sessionID;
    }

    async generateMessageURL(messageHeader, messageBody) {
        return "/message?messageHeader=" + messageHeader + "&messageBody=" + messageBody;
    }

    // Render Page //

    async getBase() {
        logger.logDebug("[WEBINTERFACE] Reading base file: " + this.baseDirectory + "/base.html");
        return this.parseBase(await read(this.baseDirectory + "/base.html"));
    }

    async generateNavigation(sessionID) {
        let outputHTML = "";

        if (await this.getSessionID() != null) {
            for (const [name, link] of Object.entries(this.privateNavigation)) {
                outputHTML = outputHTML +
                    '<li class="nav-item"> \
                    <a class="nav-link" href="' + link + '"> \
                    ' + name + '\
                    </a> \
                </li>'
            }

            outputHTML = outputHTML +
                '<div class="nav-item text-nowrap"> \
                <a class="nav-link px-3" href="/webinterface/account/logout">Sign out</a> \
            </div>';
        } else {
            outputHTML = outputHTML +
                '<div class="nav-item text-nowrap"> \
                <a class="nav-link px-3" href="/webinterface/account/login">Login</a> \
            </div> \
            <div class="nav-item text-nowrap"> \
                <a class="nav-link px-3" href="/webinterface/account/register">Register</a> \
            </div>';
        }

        return outputHTML;

    }

    async parseBase(baseHTML) {
        let parsed = String(baseHTML)
            .replaceAll("{{servername}}", database.core.serverConfig.name)
            .replaceAll("{{navigation}}", await this.generateNavigation());
        return parsed;
    }

    async readFile(filename) {
        logger.logDebug("[WEBINTERFACE] Reading file: " + this.baseDirectory + "/files/" + filename);
        return await read(this.baseDirectory + "/files/" + filename);
    }

    async displayMessage(messageHeader, messageContent) {
        let baseHTML = await this.getBase();
        return String(baseHTML)
            .replace("{{content}}", await read(this.baseDirectory + "/message.html"))
            .replace("{{messageHeader}}", messageHeader)
            .replace("{{messageContent}}", messageContent);
    }

    async displayContent(content) {
        logger.logDebug("[WEBINTERFACE] Test display: " + content);
        let baseHTML = await this.getBase();
        return String(baseHTML).replace("{{content}}", content);
    }

    async displayHomePage(accountData) {
        logger.logDebug(accountData);
        let baseHTML = await this.getBase();
        return String(baseHTML)
            .replace("{{content}}", await read(this.baseDirectory + "/account/home.html"))
            .replace("{{version}}", database.core.serverConfig.serverVersion)
            .replace("{{username}}", accountData.email);
    }

    async displayLoginPage() {
        let baseHTML = await this.getBase();
        return String(baseHTML).replace("{{content}}", await read(this.baseDirectory + "/account/login.html"));
    }

    async displaySettingsPage() {
        let baseHTML = await this.getBase();
        return String(baseHTML).replace("{{content}}", await read(this.baseDirectory + "/account/settings.html"));
    }

    async displayRegistrationPage(editions) {
        let editionsHTML = "";

        for (const [name, value] of Object.entries(editions)) {
            editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>'
        }

        let baseHTML = await this.getBase();
        let registrationPageHTML = String(baseHTML)
            .replace("{{content}}", await read(this.baseDirectory + "/account/register.html"))
            .replace("{{editions}}", editionsHTML)


        return registrationPageHTML;
    }

    async checkForSessionID(request) {
        const sessionID = request.cookies.PHPSESSID;
        if (sessionID) {
            this.setSessionID(sessionID);
            logger.logDebug("[WEBINTERFACE] Found sessionID cookie: " + sessionID);
            return sessionID;
        } else {
            this.setSessionID(null);
        }
    
        return false;
    }
}

module.exports = new webInterface();

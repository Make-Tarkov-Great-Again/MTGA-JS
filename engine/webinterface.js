const { logger, read } = require("../plugins/utilities");
const database = require("./database");

/**
 * The webInterfaceController handles the parsing of templates.
 * Can be optimized.
 */
class WebInterface {
    constructor() {
        this.sessionID = null;
        this.privateNavigation = {
            "Start Tarkov": "/webinterface/weblauncher/start",
            "Settings": "/webinterface/account/settings"
        };
        this.baseDirectory = "./templates/webinterface";
        logger.logDebug("[WEBINTERFACE] Constructed.");
    }

    // Auth //
    async setSessionID(sessionID) {
        this.sessionID = sessionID;
    }

    async getSessionID() {
        return this.sessionID;
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
                </li>';
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
        const parsed = String(baseHTML)
            .replaceAll("{{servername}}", database.core.serverConfig.name)
            .replaceAll("{{navigation}}", await this.generateNavigation());
        return parsed;
    }

    async readFile(filename) {
        logger.logDebug("[WEBINTERFACE] Reading file: " + this.baseDirectory + "/files/" + filename);
        await read(this.baseDirectory + "/files/" + filename);
    }

    async renderPage(templateFile, variables = {}) {
        const baseHTML = await this.getBase();
        let fusedPage =  String(baseHTML).replace("{{content}}", await read(this.baseDirectory + templateFile));

        for (const [key, value] of Object.entries(variables)) {
            fusedPage = String(fusedPage).replace("{{" + key + "}}", value);
        }

        return fusedPage;
    }

    async renderMessage(messageHeader, messageContent) {
        const pageVariables = {
            "messageHeader": messageHeader,
            "messageContent": messageContent
        };
        await this.renderPage("/message.html", pageVariables);
    }
}

module.exports = new WebInterface();

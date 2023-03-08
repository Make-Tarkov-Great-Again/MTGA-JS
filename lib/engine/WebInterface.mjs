import { logger, read } from "../utilities/_index.mjs";
import { database } from "../../app.mjs";


/**
 * The webInterfaceController handles the parsing of templates.
 * Can be optimized.
 */
class WebInterface {
    constructor() {
        this.sessionID = null;
        this.privateNavigation = {
            "Start Tarkov": "/webinterface/weblauncher/start",
            "Profile Editor": "/webinterface/account/editor",
            "Settings": "/webinterface/account/settings"
        };
        this.baseDirectory = "./assets/templates/webinterface";
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
            logger.warn(`[WEBINTERFACE] Found sessionID cookie: ${sessionID}`);
            return sessionID;
        }
        this.setSessionID(null);
        return false;
    }

    // Render Page //

    async getBase() {
        //logger.warn(`[WEBINTERFACE] Reading base file: ${this.baseDirectory}/base.html`);
        const base = await read(`${this.baseDirectory}/base.html`);
        return this.parseBase(base);
    }

    async generateNavigation() {
        let outputHTML = "";

        const sessionID = await this.getSessionID();
        if (sessionID && database.profiles[sessionID]?.account) {
            for (const [name, link] of Object.entries(this.privateNavigation)) {
                outputHTML = `${outputHTML}` +
                '<li class="nav-item"> '+
                    `<a class="nav-link" href="${link}">`+
                        `${name}` +
                    '</a>' +
                '</li>';
            }

            outputHTML = `${outputHTML}` +
            '<div class="nav-item text-nowrap">' +
                '<a class="nav-link px-3" href="/webinterface/account/logout">Sign out</a>' +
            '</div>';
        } else {
            outputHTML = `${outputHTML}` +
            '<div class="nav-item text-nowrap">' +
                '<a class="nav-link px-3" href="/webinterface/account/login">Login</a>' +
            '</div>' +
            '<div class="nav-item text-nowrap">' +
                '<a class="nav-link px-3" href="/webinterface/account/register">Register</a>' +
            '</div>';
        }

        return outputHTML;

    }

    async parseBase(baseHTML) {
        const { name } = database.core.serverConfig;
        return String(baseHTML)
            .replaceAll("{{servername}}", name)
            .replaceAll("{{navigation}}", await this.generateNavigation());
    }

    async readFile(filename) {
        return read(`${this.baseDirectory}/resources/${filename}`);
    }

    async renderPage(templateFile, variables = {}) {
        const baseHTML = await this.getBase();
        let fusedPage = String(baseHTML).replace("{{content}}", await read(this.baseDirectory + templateFile));

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
        return this.renderPage("/message.html", pageVariables);
    }
}

export default new WebInterface();

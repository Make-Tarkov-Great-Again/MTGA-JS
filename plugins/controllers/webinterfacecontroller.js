const {
    read
} = require('../utilities/fileIO');

const {
    app,
    database: {
        core
    }
} = require('../../app');

const logger = require("../utilities/logger");

class webInterfaceController {
    constructor() {
        this.sessionID = null;
        this.privateNavigation = {
            "Start Tarkov": "/webinterface/weblauncher/start"
        }
        this.baseDirectory = "./plugins/templates/webinterface";
        logger.logDebug("[WEBINTERFACE] Constructed.")
    }

    // Auth //
    setSessionID(sessionID) {
        this.sessionID = sessionID;
    }

    getSessionID() {
        return this.sessionID;
    }

    // Render Page //

    getBase() {
        logger.logDebug("[WEBINTERFACE] Reading base file: " + this.baseDirectory + "/base.html");
        return this.parseBase(read(this.baseDirectory + "/base.html"));
    }

    generateNavigation(sessionID) {
        let outputHTML = "";
        
        if(this.getSessionID() != null) {
            for(const [name, link] of Object.entries(this.privateNavigation)) {
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

    parseBase(baseHTML){
        let parsed = String(baseHTML)
                .replaceAll("{{servername}}", core.serverConfig.name)
                .replaceAll("{{navigation}}", this.generateNavigation());
        return parsed;
    }

    readFile(filename) {
        logger.logDebug("[WEBINTERFACE] Reading file: " + this.baseDirectory + "/files/" + filename );
        return read(this.baseDirectory + "/files/" + filename);
    }

    displayMessage(messageHeader, messageContent) {
        let baseHTML = this.getBase();
        return String(baseHTML)
            .replace("{{content}}", read(this.baseDirectory + "/message.html"))
            .replace("{{messageHeader}}", messageHeader)
            .replace("{{messageContent}}", messageContent);
    }

    displayContent(content){
        logger.logDebug("[WEBINTERFACE] Test display: " + content);
        let baseHTML = this.getBase();
        return String(baseHTML).replace("{{content}}", content);
    }

    displayHomePage(accountData) {
        logger.logDebug(accountData);
        let baseHTML = this.getBase();
        return String(baseHTML)
            .replace("{{content}}", read(this.baseDirectory + "/account/home.html"))
            .replace("{{version}}", core.serverConfig.serverVersion)
            .replace("{{username}}", accountData.email);
    }
    
    displayLoginPage() {
        let baseHTML = this.getBase();
        return String(baseHTML).replace("{{content}}", read(this.baseDirectory + "/account/login.html"));
    }

    displayRegistrationPage(editions) {
        let editionsHTML = "";

        for(const [name, value] of Object.entries(editions)) {
            editionsHTML = editionsHTML + '<option value="' + value + '">' + value + '</option>'
        }

        let baseHTML = this.getBase();
        let registrationPageHTML = String(baseHTML)
            .replace("{{content}}", read(this.baseDirectory + "/account/register.html"))
            .replace("{{editions}}", editionsHTML)
        

        return registrationPageHTML;
    }
}

module.exports = new webInterfaceController();

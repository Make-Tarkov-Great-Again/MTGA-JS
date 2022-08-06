const { BaseModel } = require("./BaseModel");
const { generateUniqueId, logger, generateRandomInt } = require("../../utilities");
const { database } = require("../../app");


class Bot extends BaseModel {
    constructor(id, aid) {
        super();
        this._id = id;
        this.aid = aid;
    }

    async setInfo(newInfo) {
        this.Info = newInfo;
    }

    async setCustomization(newCustomization) {
        this.Customization = newCustomization;
    }

    async setHealth(newHealth) {
        this.Health = newHealth;
    }

    async generateInfo(role, difficulty) {
        // this function generateInfo, that mean name, role, side etc...
        const templateInfo = database.core.botTemplate.Info;
        // this part generate name, it's a sub function that can be extracted
        templateInfo.Nickname = await this.generateNickname(role);
        // other info related generation
        templateInfo.Role = role;

        let appearance = database.bots.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (typeof database.bots.appearance[role] != "undefined") {
                appearance = database.bots.appearance[role];
            }
            logger.logError(`[Bot : generateCustomization] Role [${role}] appearance not handled`);
            templateInfo.Voice = appearance.Voice[await generateRandomInt(0, appearance.Voice.length)];
        }


        this.setInfo(templateInfo);
    }

    async generateNickname(role) {

        if (["exUsec", "pmcBot", "followerGluharSecurity", "followerGluharScout",
            "followerGluharAssault", "followerGluharSnipe", "followerStormtrooper"].includes(role)) {
            return database.bots.names.followergluhar[await generateRandomInt(0, database.bots.names.followergluhar.length)];
        } else if (["marksman", "cursedAssault", "playerscav", "assault"].includes(role)) {
            return database.bots.names.scav[await generateRandomInt(0, database.bots.names.scav.length)];
        } else if (["followerSanitar", "followerKojaniy", "followerBully"].includes(role)) {
            return database.bots.names[role][await generateRandomInt(0, database.bots.names[role].length)];
        } else if (["usec", "bear"].includes(role)) {
            return database.bots.names.normal[await generateRandomInt(0, database.bots.names.normal.length)];
        } else {
            if (database.bots.names[role]) {
                return database.bots.names[role][0];
            }
            logger.logError(`[Bot : generateNickname] Role [${role}] not handled - scav name applied`);
            logger.logError(`Add ${role} to botNames in database/bots and adjust function`);
            return database.bots.names.scav[await generateRandomInt(0, database.bots.names.scav.length)];
        }
    }

    async generateCustomization(role = null) {
        const templateCustomization = database.core.botTemplate.Customization;

        let appearance = database.bots.appearance.random;
        if (role) { // if role is given, use it to generate appearance
            if (typeof database.bots.appearance[role] != "undefined") {
                appearance = database.bots.appearance[role];
            }
            logger.logError(`[Bot : generateCustomization] Role [${role}] appearance not handled`);
        }

        templateCustomization.Body = appearance.Body[await generateRandomInt(0, appearance.Body.length)];
        templateCustomization.Head = appearance.Head[await generateRandomInt(0, appearance.Head.length)];
        if (templateCustomization.Body === "609e86926e8078716f600883") {
            /**
             * Tagilla doesn't have a separate head texture, he uses No_Mesh
             * head texture is in the body texture, so we need to default
             */
            templateCustomization.Head = "5d5f8ba486f77431254e7fd2";
        }
        templateCustomization.Feet = appearance.Feet[await generateRandomInt(0, appearance.Feet.length)];
        templateCustomization.Hands = appearance.Hands[await generateRandomInt(0, appearance.Hands.length)];

        // do gen
        this.setCustomization(templateCustomization);
    }

    async generateHealth() {
        const templateHealth = database.core.botTemplate.Health;
        // do gen
        this.setHealth(templateHealth);
    }

    /**
     * Generate a list of bot corresponding to the give conditions in request
     * @param {Request} request
     * @param {Reply} reply
     */
    static async generateBots(request = null, reply = null) {
        const dummyRequest = require("../../dummyBotRequest.json"); //for testing purposes
        const botsParameters = dummyRequest.conditions;
        //let aid = 0;
        // I don't know the return value yet, it's just to keep them somewhere for testing purposes
        const generatedBots = [];
        for (const botParameter of botsParameters) {
            const { Role, Limit, Difficulty } = botParameter;

            for (let i = 0; i < Limit; i++) {
                const newBot = new Bot(await generateUniqueId(), i);
                // following retrieve template data from database
                await newBot.generateInfo(Role, Difficulty);
                await newBot.generateCustomization();
                await newBot.generateHealth();

                //template.Info = await this.generateInfo(template.Info, Role, Difficulty);
                //template.Customization = await this.generateCustomization(template.Customization);
                //template.Health = await this.generateHealth(template.Health);


                //aid++;
            }

        }
    }

}

module.exports.Bot = Bot;

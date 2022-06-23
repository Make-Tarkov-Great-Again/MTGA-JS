const { database } = require("../../../app");
const { account } = require("../../models/account");
const { logger, fastifyResponse } = require("../../utilities");
/**
 * This is an example controller with a basic callset.
 */
class menuController {

    static getAccountLanguage = async (request, sessionID) => {
        const playerAccount = account.get(await fastifyResponse.getSessionID(request));
        if (playerAccount) {
            if (playerAccount.lang != (null || undefined || "") && playerAccount.lang != request.params['language']) {
                playerAccount.lang = request.params['language'];
            }
        }
        return playerAccount.lang;
    }

    static clientMenuLocale = async (request = null, reply = null) => {
        const lang = await menuController.getAccountLanguage(request);
        logger.logDebug(database.locales[lang].menu);
        return fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(database.locales[lang].menu)
            )
    }


    /**
     * i am still trying to figure out how you're doing 
     * things so i didn't wanna mess anything up
     */
    static clientGlobalLocale = async (request = null, reply = null) => {
        const lang = await menuController.getAccountLanguage(request);
        return fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(database.locales.global[lang])
            )
    }

    static clientGetLanguages = async (request = null, reply = null) => {
        return fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(database.locales.languages)
            )
    }



}

module.exports.menuController = menuController;
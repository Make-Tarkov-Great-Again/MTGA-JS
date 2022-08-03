const { database } = require("../../app");
const { Account } = require("../models");
const { logger, FastifyResponse } = require("../../utilities");


class MenuController {
    static clientMenuLocale = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        if (playerAccount) {
            if (playerAccount.getLanguage() != request.params['language']) {
                playerAccount.lang = request.params['language'];
                playerAccount.save();
            }
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.locales[playerAccount.getLanguage()].menu)
            )
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ERROR", 999, "ERROR SHIT")
            )
        }
    }
}

module.exports.MenuController = MenuController;
const { database } = require("../../../app");
const { account } = require("../../models");
const { logger, fastifyResponse } = require("../../utilities");


class MenuController {
    static clientMenuLocale = async (request = null, reply = null) => {
        const playerAccount = await account.get(await fastifyResponse.getSessionID(request));
        if (playerAccount) {
            if (playerAccount.getLanguage() != request.params['language']) {
                playerAccount.lang = request.params['language'];
                playerAccount.save();
            }
        }
        
        return fastifyResponse.zlibJsonReply (
            reply,
            fastifyResponse.applyBody(database.locales[playerAccount.getLanguage()].menu)
        )
    }
}

module.exports.menuController = MenuController;
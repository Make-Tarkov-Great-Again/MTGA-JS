const { database } = require("../../../app");
const { account } = require("../../models/account");
const { logger, fastifyResponse } = require("../../utilities");
/**
 * This is an example controller with a basic callset.
 */
 class menuController {
    static clientMenuLocale = async (request = null, reply = null) => {
       let playerAccount = account.get(await fastifyResponse.getSessionID(request));
       if(playerAccount) {
            if(playerAccount.lang != (null || undefined || "") && playerAccount.lang != request.params['language'])
            {
                playerAccount.lang = request.params['language'];
            }

            logger.logDebug(database.locales[playerAccount.lang].menu);

            return await fastifyResponse.zlibJsonReply
            (
                reply,
                fastifyResponse.applyBody(database.locales[playerAccount.lang].menu)
            )
       }
    }
}

module.exports.menuController = menuController;
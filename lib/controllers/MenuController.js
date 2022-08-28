const { Account } = require('../models/Account');
const { FastifyResponse } = require("../../utilities");


class MenuController {
    static async clientMenuLocale(request = null, reply = null) {
        const { database: { locales } } = require("../../app");
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        if (playerAccount) {

            playerAccount.lang = request.params['language'];
            await playerAccount.save();
            
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(locales[playerAccount.lang].menu)
            );
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody("ERROR", 999, "ERROR SHIT")
            );
        }
    };
}

module.exports.MenuController = MenuController;

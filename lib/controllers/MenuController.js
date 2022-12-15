const { Account } = require('../models/Account');
const { Locale } = require('../models/Locale');
const { Response } = require("../utilities");


class MenuController {
    static async clientMenuLocale(request, reply) {
        const playerAccount = await Account.get(await Response.getSessionID(request));
        if (playerAccount) {

            if (playerAccount.lang !== request.params['language']) {
                playerAccount.lang = request.params['language'];
                await playerAccount.save();
            }

            const locale = await Locale.get(playerAccount.lang)

            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(locale.menu)
            );
        } else {
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody("ERROR", 999, "ERROR SHIT")
            );
        }
    };
}

module.exports.MenuController = MenuController;

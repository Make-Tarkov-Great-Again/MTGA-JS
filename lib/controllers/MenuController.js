const { Account } = require('../models/Account');
const { Response } = require("../utilities");


class MenuController {
    static async clientMenuLocale(request, reply) {
        const { database: { locales } } = require("../../app");
        const playerAccount = await Account.get(await Response.getSessionID(request));
        if (playerAccount) {

            playerAccount.lang = request.params['language'];
            await playerAccount.save();

            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(locales[playerAccount.lang].menu)
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

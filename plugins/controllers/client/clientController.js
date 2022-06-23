const { database } = require("../../../app");
const { account } = require("../../models/account");
const { fastifyResponse } = require("../../utilities/fastifyResponse");

/**
 * The controller for all ungrouped routes.
 */
class clientController {
    static clientLocale = async (request = null, reply = null) => {
        const playerAccount = await account.get(await fastifyResponse.getSessionID(request));
        if (playerAccount) {
            return fastifyResponse.zlibJsonReply(
                reply,
                fastifyResponse.applyBody(database.locales.global[playerAccount.getLanguage()])
            )
        }
    }

    static clientLanguages = async (request = null, reply = null) => {
        return fastifyResponse.zlibJsonReply(
            reply,
            fastifyResponse.applyBody(database.languages)
        )
    }

    static clientItems = async (request = null, reply = null) => {
        return fastifyResponse.zlibJsonReply(
            reply,
            fastifyResponse.applyBody(database.items)
        )
    }

    static clientCustomization = async (request = null, reply = null) => {
        return fastifyResponse.zlibJsonReply(
            reply,
            fastifyResponse.applyBody(database.clientCustomization)
        )
    }
}

module.exports.clientController = clientController;
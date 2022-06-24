const { database } = require("../../../app");
const { Account, Item } = require("../../models");
const { FastifyResponse } = require("../../utilities/FastifyResponse");

/**
 * The controller for all ungrouped routes.
 */
class ClientController {
    static clientLocale = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await fastifyResponse.getSessionID(request));
        if (playerAccount) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.locales.global[playerAccount.getLanguage()])
            )
        }
    }

    static clientLanguages = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.languages)
        )
    }

    static clientItems = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(Item.getAll())
        )
    }

    static clientCustomization = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.clientCustomization)
        )
    }

    static clientGlobals = async (request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.globals)
        )
    }
}

module.exports.ClientController = ClientController;
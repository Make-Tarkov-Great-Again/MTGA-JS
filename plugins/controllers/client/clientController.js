const { database } = require("../../../app");
const { Account, Item, Language, Locale } = require("../../models");
const { logger } = require("../../utilities");
const { FastifyResponse } = require("../../utilities/FastifyResponse");

/**
 * The controller for all ungrouped routes.
 */
class ClientController {
    static clientLocale = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const requestedLang = request.url.replace("/client/locale/", "");

        if (playerAccount.lang) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.locales[playerAccount.lang].locale)
            )
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.locales[requestedLang].locale)
            )
        }
    }

    static clientLanguages = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Language.getAllWithoutKeys())
        )
    }

    static clientItems = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Item.getAll())
        )
    }

    static clientCustomization = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.clientCustomization)
        )
    }

    static clientGlobals = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.globals)
        )
    }

    static clientSettings = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.clientSettings)
        )
    }

    static clientProfileList = async (request = null, reply = null) => {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(playerAccount.profile.character)
        )
    }

    static clientAccountCustomization = async (_request = null, reply = null) => {
        {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(database.customization)
            )
        }
    }
}

module.exports.ClientController = ClientController;
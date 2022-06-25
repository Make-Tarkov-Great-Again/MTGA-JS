const { database } = require("../../../app");
const { Account, Item, Language, Locale } = require("../../models");
const { logger, stringify, FastifyResponse } = require("../../utilities");

/**
 * The controller for all ungrouped routes.
 */
class ClientController {
    static clientLocale = async (request = null, reply = null) => {
        const requestedLanguage = request.params.language;
        if (requestedLanguage) {
            const language = await Locale.get(requestedLanguage);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(language.locale)
            )
        } else {
            const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
            const language = await Locale.get(playerAccount.getLanguage())

            if (playerAccount) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(language.locale)
                )
            }
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
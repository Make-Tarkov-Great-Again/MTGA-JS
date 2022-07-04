const { database } = require("../../../app");
const { Account, Item, Language, Locale, 
    Customization, Location, HideoutArea, 
    HideoutProduction, HideoutScavcase, Quest } = require("../../models");
const { logger, stringify, FastifyResponse, writeFile } = require("../../utilities");

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
            FastifyResponse.applyBody(await Customization.getAll())
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
        const customizations = [];
        const nonFiltered = await Customization.getAllWithoutKeys();
        for (const custo of nonFiltered) {
            if (custo._props.Side && custo._props.Side.length > 0) {
                customizations.push(custo._id);
            }
        }
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(customizations)
        )
    }

    static clientWeather = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.weather)
        )
    }

    static clientLocations = async (_request = null, reply = null) => {
        let locations = await Location.getAll();
        let baseResponse = database.core.location_base;
        let dissolvedLocations = {};

        for (const [id, data] of Object.entries(locations)) {
            let newData = await data.dissolve();
            dissolvedLocations[id] = newData.base;
            dissolvedLocations[id].Loot = [];
        }

        baseResponse.locations = dissolvedLocations;

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(baseResponse)
        )
    }

    static clientHideoutAreas = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await HideoutArea.getAllWithoutKeys())
        );
    };

    static clientHideoutSettings = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.hideoutSettings)
        );
    };

    static clientHideoutProductionRecipes = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await HideoutProduction.getAllWithoutKeys())
        );
    };

    static clientHideoutProductionScavcaseRecipes = async (_request = null, reply = null) => {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await HideoutScavcase.getAllWithoutKeys())
        );
    };

    static clientQuestList = async (_request = null, reply = null) => {
        const quests = await Quest.getAllWithoutKeys();
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(quests)
        );
    };

}

module.exports.ClientController = ClientController;
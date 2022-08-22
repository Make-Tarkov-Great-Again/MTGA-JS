const { database } = require("../../app");
const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Language } = require('../models/Language');
const { Locale } = require('../models/Locale');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { logger, FastifyResponse } = require("../../utilities");


class ClientController {
    static async clientLocale(request = null, reply = null) {
        const requestedLanguage = request.params.language;
        if (requestedLanguage) {
            const language = await Locale.get(requestedLanguage);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(language.locale)
            );
        } else {
            const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
            const language = await Locale.get(playerAccount.getLanguage());

            if (playerAccount) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(language.locale)
                );
            }
        }
    }

    static async clientLanguages(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Language.getAllWithoutKeys())
        );
    }

    static async clientItems(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Item.getAll())
        );
    }

    static async clientCustomization(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(await Customization.getAll())
        );
    }

    static async clientGlobals(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.globals)
        );
    }

    static async clientSettings(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.core.clientSettings)
        );
    }

    static async clientAccountCustomization(_request = null, reply = null) {
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
        );
    }

    static async clientWeather(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(database.weather)
        );
    }

    static async clientLocations(_request = null, reply = null) {
        const baseResponse = database.core.locations;
        logger.logDebug(`Using dumps for locations - will work out a better way later.`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(baseResponse)
        );
    }

    static async clientQuestList(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const quests = await Quest.getQuestsForPlayer(playerAccount);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(quests)
        );
    }

    static async clientMailDialogList(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const playerProfile = await playerAccount.getProfile();
        const dialogues = await playerProfile.getDialogues();
        const listDialogues = [];
        for (const dialogueID of Object.keys(dialogues)) {
            const dialogueData = dialogues[dialogueID];
            const previewDialogue = {
                _id: dialogueData._id,
                type: 2,
                attachmentsNew: dialogueData.attachmentsNew,
                new: dialogueData.new,
                pinned: dialogueData.pinned
            };
            const previewMessage = dialogueData.messages[dialogueData.messages.length - 1];
            previewDialogue.message = {
                dt: previewMessage.dt,
                type: previewMessage.type,
                templateId: previewMessage.templateId,
                uid: dialogueData._id
            };
            listDialogues.push(previewDialogue);
        }
        return listDialogues;
    }

}

module.exports.ClientController = ClientController;

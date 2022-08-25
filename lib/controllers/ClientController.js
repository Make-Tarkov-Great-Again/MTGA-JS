const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Language } = require('../models/Language');
const { Locale } = require('../models/Locale');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Profile } = require('../models/Profile');
const { logger, FastifyResponse, getCurrentTimestamp } = require("../../utilities");


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
        const { database: { core: { globals } } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(globals)
        );
    }

    static async clientSettings(_request = null, reply = null) {
        const { database: { core: { clientSettings } } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(clientSettings)
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
        const { database: { weather } } = require("../../app");
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(weather)
        );
    }

    static async clientLocations(_request = null, reply = null) {
        const { database: { core: { locations } } } = require("../../app");
        //logger.logDebug(`Using dumps for locations - will work out a better way later.`);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(locations)
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
        const output = [];
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
            output.push(previewDialogue);
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    }

    static async clientMailDialogView(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const time = await getCurrentTimestamp();
        const dialogues = await playerProfile.getDialogues();

        const dialog = dialogues[request.body.dialogId];
        dialog.new = 0;

        const output = {
            messages: dialog.messages,
            profiles: [],
            hasMessageWithRewards: false
        }

        //const rewards = dialog.messages.some(x => x.hasRewards && x.items?.data?.length > 0 && !x.rewardCollected);
        for (const message of dialog.messages) {
            if (message.hasRewards && !message.rewardCollected && time < (message.dt + message.maxStorageTime)) {
                dialog.attachmentsNew++;
            }
            if (message.hasRewards && message.items?.data?.length > 0 && !message.rewardCollected) {
                output.hasMessageWithRewards = true;
            }
        }

        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    }

    static async clientMailDialogRemove(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogues = await playerProfile.getDialogues();

        delete dialogues[request.body.dialogId]

        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogPin(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogues = await playerProfile.getDialogues();

        dialogues[request.body.dialogId].pinned = true;

        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogUnpin(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogues = await playerProfile.getDialogues();

        dialogues[request.body.dialogId].pinned = false;

        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogRead(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogues = await playerProfile.getDialogues();

        for (const id of request.body.dialogs) {
            dialogues[id].new = 0;
            dialogues[id].attachmentsNew = 0;
        }

        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

}

module.exports.ClientController = ClientController;

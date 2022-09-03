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
            const { locale } = await Locale.get(requestedLanguage);
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(locale)
            );
        } else {
            const { lang } = await Account.get(await FastifyResponse.getSessionID(request));
            const { locale } = await Locale.get(lang);

            if (playerAccount) {
                return FastifyResponse.zlibJsonReply(
                    reply,
                    FastifyResponse.applyBody(locale)
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
        //logger.debug(`Using dumps for locations - will work out a better way later.`);
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
        const { dialogues } = await Profile.get(await FastifyResponse.getSessionID(request));
        const output = [];
        for (const dialogueID of Object.keys(dialogues)) {
            const dialogueData = dialogues[dialogueID];
            const previewDialogue = await ClientControllerUtils.createDialog(dialogueData)

            output.push(previewDialogue);
        }

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        );
    }

    static async clientMailDialogView(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId]
        const time = await getCurrentTimestamp();
        dialogue.new = 0;

        const output = {
            messages: dialogue.messages,
            profiles: [],
            hasMessageWithRewards: false
        }

        //const rewards = dialogue.messages.some(x => x.hasRewards && x.items?.data?.length > 0 && !x.rewardCollected);
        for (const message of dialogue.messages) {
            if (message.hasRewards && !message.rewardCollected && time < (message.dt + message.maxStorageTime)) {
                dialogue.attachmentsNew++;
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

        delete playerProfile.dialogues[request.body.dialogId];
        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogPin(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId]

        dialogue.pinned = true;
        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogUnpin(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId];

        dialogue.pinned = false;
        await playerProfile.save();

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody([])
        )
    }

    static async clientMailDialogRead(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        const { dialogues } = playerProfile

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

    static async clientMailDialogInfo(request, reply) {
        const { dialogues } = await Profile.get(await FastifyResponse.getSessionID(request));
        const output = await ClientControllerUtils.createDialog(dialogues[request.body.dialogId]);

        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(output)
        )
    }
}
class ClientControllerUtils {
    static async createDialog(dialog) {
        const output = {
            "_id": dialog._id,
            "type": 2, // Type npcTrader.
            "new": dialog.new,
            "attachmentsNew": dialog.attachmentsNew,
            "pinned": dialog.pinned
        }

        const message = dialog.messages[dialog.messages.length - 1]
        output["message"] = {
            dt: message.dt,
            type: message.type,
            templateId: message.templateId,
            uid: dialog._id
        }
        return output;
    }

}
module.exports.ClientControllerUtils = ClientControllerUtils;
module.exports.ClientController = ClientController;

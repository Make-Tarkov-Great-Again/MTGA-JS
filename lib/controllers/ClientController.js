const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Language } = require('../models/Language');
const { Locale } = require('../models/Locale');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Profile } = require('../models/Profile');
const { logger, Response, getCurrentTimestamp } = require("../../utilities");
const { Dialogue } = require('../models/Dialogue');


class ClientController {
    static async clientLocale(request = null, reply = null) {
        if (request.params.language) {
            const { locale } = await Locale.get(request.params.language);
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(locale)
            );
        } else {
            const playerAccount = await Account.get(await Response.getSessionID(request));
            const { locale } = await Locale.get(playerAccount.lang);

            if (playerAccount) {
                return Response.zlibJsonReply(
                    reply,
                    Response.applyBody(locale)
                );
            }
        }
    }

    static async clientLanguages(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(await Language.getAllWithoutKeys())
        );
    }

    static async clientItems(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(await Item.getAll())
        );
    }

    static async clientCustomization(_request = null, reply = null) {
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(await Customization.getAll())
        );
    }

    static async clientGlobals(_request = null, reply = null) {
        const { database: { core: { globals } } } = require("../../app");
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(globals)
        );
    }

    static async clientSettings(_request = null, reply = null) {
        const { database: { core: { clientSettings } } } = require("../../app");
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(clientSettings)
        );
    }

    static async clientAccountCustomization(_request = null, reply = null) {
        const output = [];
        const customizations = await Customization.getAllWithoutKeys();
        for (const customization of customizations) {
            if (customization._props.Side && customization._props.Side.length > 0) {
                output.push(customization._id);
            }
        }
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    }

    static async clientWeather(_request = null, reply = null) {
        const { database: { weather } } = require("../../app");
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(weather)
        );
    }

    static async clientLocations(_request = null, reply = null) {
        const { database: { core: { locations } } } = require("../../app");
        //logger.debug(`Using dumps for locations - will work out a better way later.`);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(locations)
        );
    }

    static async clientQuestList(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const quests = await Quest.getQuestsForPlayer(playerProfile);
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(quests)
        );
    }

    static async clientMailDialogList(request, reply) {
        const { dialogues } = await Profile.get(await Response.getSessionID(request));

        const output = [];
        if (Object.keys(dialogues).length === 0) {
            return Response.zlibJsonReply(
                reply,
                Response.applyBody(output)
            );
        }
        for (const id in dialogues) {
            const dialogue = dialogues[id];
            output.push(await Quest.generateMailDialogListDialogue(dialogue));
        }

        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        );
    }

    static async clientMailDialogView(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId];

        dialogue.new = 0;
        dialogue.attachmentsNew = await dialogue.getAttachmentsNew()

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                messages: dialogue.messages,
                profiles: [],
                hasMessagesWithRewards: await dialogue.hasMessagesWithRewards()
            })
        );
    }

    static async clientMailDialogRemove(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));

        delete playerProfile.dialogues[request.body.dialogId];

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientMailDialogPin(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));

        const dialogue = playerProfile.dialogues[request.body.dialogId];
        dialogue.pinned = true;

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientMailDialogUnpin(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));

        const dialogue = playerProfile.dialogues[request.body.dialogId];
        dialogue.pinned = false;

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientMailDialogRead(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));

        for (const id of request.body.dialogs) {
            playerProfile.dialogues[id].new = 0;
            playerProfile.dialogues[id].attachmentsNew = 0;
        }

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody([])
        )
    }

    static async clientMailDialogInfo(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        let output = {};
        if (Object.keys(playerProfile.dialogues).length !== 0) {
            output = await Dialogue.generateMailDialogListDialogue(playerProfile.dialogues[request.body.dialogId]);
        }

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody(output)
        )
    }

    static async clientMailDialogGetAllAttachments(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId];
        dialogue.attachmentsNew = 0;

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            Response.applyBody({
                messages: await dialogue.messagesWithAttachments(),
                profiles: [],
                hasMessagesWithRewards: await dialogue.hasMessagesWithRewards()
            })
        )

    }
}
module.exports.ClientController = ClientController;

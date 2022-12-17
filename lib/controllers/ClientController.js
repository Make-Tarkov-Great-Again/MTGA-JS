const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Language } = require('../models/Language');
const { Locale } = require('../models/Locale');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Profile } = require('../models/Profile');
const { logger, Response, getCurrentTimestamp } = require("../utilities");
const { Dialogue } = require('../models/Dialogue');
const { FriendControllerUtil } = require('./FriendController');
const { database: { core: { globals, clientSettings, locations, gameplay } }, database } = require("../../app");



class ClientController {
    static async clientLocale(request, reply) {
        if (request.params.language) {
            const { locale } = await Locale.get(request.params.language);
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(locale)
            );
        } else {
            const playerAccount = await Account.get(await Response.getSessionID(request));
            const { locale } = await Locale.get(playerAccount.lang);

            if (playerAccount) {
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(locale)
                );
            }
        }
    }

    static async clientLanguages(reply) {
        const languages = await Language.getAll();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(languages)
        );
    }

    static async clientItems(reply) {
        const items = await Item.getAll();
        if (gameplay.raid.inRaidModding && !database?.raidItems) {
            for (const i in items) {
                const item = items[i];
                if (item?._props?.Slots?.length > 0) {
                    for (const slot of item._props.Slots) {
                        if (slot._required === true)
                            slot._required = false;
                    }
                }
            }
            database.raidItems = items;
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                database?.raidItems
                    ? database.raidItems
                    : items
            )
        );
    }

    static async clientCustomization(reply) {
        const customizations = await Customization.getAll();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(customizations)
        );
    }

    static async clientGlobals(reply) {
        globals.time = await getCurrentTimestamp();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(globals)
        );
    }

    static async clientSettings(reply) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(clientSettings)
        );
    }

    static async clientAccountCustomization(reply) {
        const output = [];
        const customizations = await Customization.getAllWithoutKeys();

        for (const customization of customizations) {
            if (customization._props.Side && customization._props.Side.length > 0) {
                output.push(customization._id);
            }
        }
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientWeather(reply) {
        const { database: { weather } } = require("../../app");
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(weather)
        );
    }

    static async clientLocations(reply) {
        //await logger.debug(`Using dumps for locations - will work out a better way later.`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(locations)
        );
    }

    static async clientQuestList(sessionID, reply) {
        const playerProfile = await Profile.get(sessionID);
        const quests = await Quest.getQuestsForPlayer(playerProfile);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(quests)
        );
    }

    static async clientMailDialogList(sessionID, reply) {
        const { dialogues } = await Profile.get(sessionID);
        const output = [];
        if (Object.keys(dialogues).length === 0) {
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(output)
            );
        }
        for (const id in dialogues) {
            const dialogue = dialogues[id];
            output.push(await Dialogue.generateMailDialogListDialogue(dialogue, sessionID));
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientMailDialogView(request, reply) {
        const { dialogues } = await Profile.get(await Response.getSessionID(request));

        // request.body.type = 1 or 2, request.body.dialogId = dialog
        let dialogue;
        for (const id in dialogues) {
            if (dialogues[id]._id === request.body.dialogId) {
                dialogue = dialogues[id];
                break;
            }
        }
        if (dialogue) {
            if (request.body.type === 2) {
                const traderDialogue = await this.viewDialogTrader(dialogue);
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(traderDialogue)
                );
            }
            else if (request.body.type === 1 || request.body.type === 6) {

                const playerDialogue = await this.viewDialogPlayer(dialogue);
                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(playerDialogue)
                );
            }
        } else { // we are assuming that the dialog between two players hasn't happened yet
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody({
                    messages: [],
                    profiles: [],
                    hasMessagesWithRewards: false
                })
            );
        }
    }

    static async viewDialogTrader(dialogue) {
        dialogue.new = 0;
        dialogue.attachmentsNew = await dialogue.getAttachmentsNew();

        return {
            messages: dialogue.messages,
            profiles: [],
            hasMessagesWithRewards: await dialogue.hasMessagesWithRewards()
        }
    }

    static async viewDialogPlayer(dialogue) {
        dialogue.new = 0;

        return {
            messages: dialogue.messages,
            profiles: dialogue.Users,
            hasMessagesWithRewards: false
        }
    }

    static async clientMailDialogRemove(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        delete playerProfile.dialogues[request.body.dialogId];

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        )
    }

    static async clientMailDialogClear(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        playerProfile.dialogues[request.body.dialogId].messages = [];

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        )
    }

    static async clientMailDialogPin(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        playerProfile.dialogues[request.body.dialogId].pinned = true;

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        )
    }

    static async clientMailDialogUnpin(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        playerProfile.dialogues[request.body.dialogId].pinned = false;

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
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
            await Response.applyEmpty("array")
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
            await Response.applyBody(output)
        )
    }

    static async clientMailDialogGetAllAttachments(request, reply) {
        const playerProfile = await Profile.get(await Response.getSessionID(request));
        const dialogue = playerProfile.dialogues[request.body.dialogId];
        dialogue.attachmentsNew = 0;

        await playerProfile.saveDialogue();

        const output = {
            messages: await dialogue.messagesWithAttachments(),
            profiles: [],
            hasMessagesWithRewards: await dialogue.hasMessagesWithRewards()
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        )
    }

    static async clientMailMessageSend(request, reply) {
        const yourProfile = await Profile.get(await Response.getSessionID(request));
        const theirProfile = await Profile.get(request.body.dialogId);

        const yourDialog = await Dialogue.createPlayerDialogue(request.body.dialogId, yourProfile.character.aid, yourProfile);
        const theirDialog = await Dialogue.createPlayerDialogue(yourProfile.character.aid, request.body.dialogId, theirProfile);

        const yourMessage = await yourDialog.playerMessageForMessageSend(request.body.text, yourProfile.character.aid)
        yourDialog.messages.push(yourMessage);
        theirDialog.messages.push(yourMessage);

        const yourMini = await FriendControllerUtil.miniAccountTemplate(yourProfile);
        const theirMini = await FriendControllerUtil.miniAccountTemplate(theirProfile);
        yourDialog.Users.push(yourMini, theirMini);
        theirDialog.Users.push(theirMini, yourMini);

        await yourProfile.saveDialogue();
        await theirProfile.saveDialogue();

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(yourMessage._id)
        );

    }

    static async clientMailMessageReply(request, reply) {
        const yourProfile = await Profile.get(request.body.dialogId);

        for (const dialogueId in yourProfile.dialogues) {
            const yourDialog = yourProfile.dialogues[dialogueId];
            if (yourDialog._id === request.body.dialogId) {

                const theirProfile = await Profile.get(dialogueId);
                const theirDialog = theirProfile.dialogues[request.body.dialogId];

                const yourMessage = await yourDialog.playerMessageForMessageSend(request.body.text, yourProfile.character.aid);

                if (request.body.replyTo !== "") {
                    for (const id in yourDialog.messages) {
                        const message = yourDialog.messages[id];
                        if (message._id === request.body.replyTo) yourMessage["replyTo"] = message;
                    }
                }

                yourDialog.messages.unshift(yourMessage);
                theirDialog.messages.unshift(yourMessage);

                await yourProfile.saveDialogue();
                await theirProfile.saveDialogue();

                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(yourMessage._id)
                );
            }
        }
    }
}
module.exports.ClientController = ClientController;

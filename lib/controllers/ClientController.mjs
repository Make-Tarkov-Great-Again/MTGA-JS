import { database } from "../../app.mjs";

import {
    Language,
    Locale,
    Account,
    Profile,
    Item,
    Customization,
    Quest,
    Dialogues
} from '../classes/_index.mjs';

import { logger, Response, getCurrentTimestamp } from "../utilities/_index.mjs";


export class ClientController {
    static async getServerList(reply) {
        const { serverConfig } = database.core;
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody([{ ip: serverConfig.ip, port: serverConfig.port }]));
    }

    static async checkVersion(request, reply) {
        const version = await Response.getVersion(request);
        logger.info(`EFT Client Version ${version} connected!`);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    isValid: true,
                    latestVersion: version
                }
            )
        );
    }

    static async sendMessage(request, reply) {
        const sessionID = await Response.getSessionID(request);
        if (request.body.dialogId === sessionID) {
            if (request.body.type === 1) await this.clientMailMessageReply(request, reply);
            if (request.body.type === 6) logger.warn(`[GROUP CHAT] not implemented`);
        }
        else await this.clientMailMessageSend(request, reply);
    }

    static async clientLocale(request, reply) {
        if (!request.params.language) {
            const account = await Account.getWithSessionId(await Response.getSessionID(request));
            const locale = await Locale.get(account.lang);

            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(locale)
            );
        }
        const { locale } = await Locale.get(request.params.language);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(locale)
        );
    }

    static async clientLanguages(reply) {
        const languages = Language.getAll();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(languages)
        );
    }

    static async clientItems(reply) {
        const { gameplay } = database.core;
        const items = Item.getAll();
        if (gameplay.raid.inRaidModding && !database?.raidItems) {
            for (const i in items) {
                const item = items[i];
                if (!item._props.Slots || item._props?.Slots.length < 1)
                    continue;
                for (const slot of item._props.Slots) {
                    slot._required = false;
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
        const customizations = Customization.getAll();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(customizations)
        );
    }

    static async clientGlobals(reply) {
        const { globals } = database.core;
        globals.time = getCurrentTimestamp();
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(globals)
        );
    }

    static async clientSettings(reply) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(database.core.clientSettings)
        );
    }

    static async clientAccountCustomization(reply) {
        const output = [];
        const customizations = Customization.getAll();

        for (const customization in customizations) {
            if (customizations[customization]._props.Side && customizations[customization]._props.Side.length > 0) {
                output.push(customization);
            }
        }
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientWeather(reply) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(database.weather)
        );
    }

    static async clientLocations(reply) {
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(
                {
                    locations: database.core.map.locations,
                    paths: database.core.map.paths
                }
            )
        );
    }

    static async clientQuestList(sessionID, reply) {
        const quests = await Quest.getQuestsForPlayer(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(quests)
        );
    }

    static async clientMailDialogList(sessionID, reply) {
        const dialogues = Dialogues.get(sessionID);
        if (Object.keys(dialogues).length === 0) {
            return Response.zlibJsonReply(
                reply,
                await Response.applyEmpty("array")
            );
        }

        const output = [];
        for (const id in dialogues) {
            const dialogue = dialogues[id];
            output.push(await Dialogues.generateMailDialogListDialogue(dialogue, sessionID));
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientMailDialogView(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialogues = Dialogues.get(sessionID);

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
                const traderDialogue = await this.viewDialogTrader(sessionID, dialogue);
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

    static async viewDialogTrader(sessionID, dialogue) {
        dialogue.new = 0;
        dialogue.attachmentsNew = await Dialogues.getAttachmentsNew(sessionID, dialogue);

        return {
            messages: dialogue.messages,
            profiles: [],
            hasMessagesWithRewards: await Dialogues.hasMessagesWithRewards(dialogue)
        };
    }

    static async viewDialogPlayer(dialogue) {
        dialogue.new = 0;

        return {
            messages: dialogue.messages,
            profiles: dialogue.Users,
            hasMessagesWithRewards: false
        };
    }

    static async clientMailDialogRemove(request, reply) {
        const playerProfile = Profile.get(await Response.getSessionID(request));
        delete playerProfile.dialogues[request.body.dialogId];

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientMailDialogClear(request, reply) {
        const playerProfile = Profile.get(await Response.getSessionID(request));
        playerProfile.dialogues[request.body.dialogId].messages = [];

        await playerProfile.saveDialogue();
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientMailDialogPin(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialog = Dialogues.getById(sessionID, request.body.dialogId);
        dialog.pinned = true;

        await Dialogues.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientMailDialogUnpin(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialog = Dialogues.getById(sessionID, request.body.dialogId);
        dialog.pinned = false;

        await Dialogues.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientMailDialogRead(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialogues = Dialogues.get(sessionID);

        for (const id of request.body.dialogs) {
            dialogues[id].new = 0;
            dialogues[id].attachmentsNew = 0;
        }

        await Dialogues.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyEmpty("array")
        );
    }

    static async clientMailDialogInfo(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialogues = Dialogues.get(sessionID);
        let output = {};
        if (Object.keys(dialogues).length !== 0) {
            output = await Dialogues.generateMailDialogListDialogue(dialogues[request.body.dialogId], sessionID);
        }

        await Dialogues.save(sessionID);
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientMailDialogGetAllAttachments(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const dialog = Dialogues.getById(sessionID, request.body.dialogId);
        dialog.attachmentsNew = 0;

        await Dialogues.save(sessionID);

        const output = {
            messages: await Dialogues.messagesWithAttachments(sessionID, dialog),
            profiles: [],
            hasMessagesWithRewards: await Dialogues.hasMessagesWithRewards(dialog)
        };

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async clientMailMessageReply(request, reply) {
        const yourProfile = Profile.get(request.body.dialogId);

        for (const dialogueId in yourProfile.dialogues) {
            const yourDialog = yourProfile.dialogues[dialogueId];
            if (yourDialog._id === request.body.dialogId) {

                const theirDialog = Dialogues.getById(dialogueId, request.body.dialogId);
                const yourMessage = await Dialogues.playerMessageForMessageSend(request.body.text, yourProfile.character.aid);

                if (request.body.replyTo !== "") {
                    for (const id in yourDialog.messages) {
                        const message = yourDialog.messages[id];
                        if (message._id === request.body.replyTo) yourMessage["replyTo"] = message;
                    }
                }

                yourDialog.messages.unshift(yourMessage);
                theirDialog.messages.unshift(yourMessage);

                await Promise.allSettled([
                    await Dialogues.save(request.body.dialogId),
                    await Dialogues.save(dialogueId)
                ]);

                return Response.zlibJsonReply(
                    reply,
                    await Response.applyBody(yourMessage._id)
                );
            }
        }
    }
}

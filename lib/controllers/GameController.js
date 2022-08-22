const { database } = require('../../app');
const { Profile } = require('../models/Profile');
const { Language } = require('../models/Language');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Locale } = require('../models/Locale');
const { Trader } = require('../models/Trader');
const { getCurrentTimestamp, logger, FastifyResponse} = require("../../utilities");

class GameController {
    // JET Basics //
    static async modeOfflinePatches(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.Patches);
    }

    static async modeOfflinePatchNodes(_request = null, reply = null) {
        return FastifyResponse.zlibJsonReply(reply, database.core.serverConfig.PatchNodes);
    }

    // Game //

    static async clientGameStart(request = null, reply = null) {
        const playerProfile = Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ utc_time: await getCurrentTimestamp() }, 0, null));
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody({ utc_time: await getCurrentTimestamp() }, 999, "Profile Not Found!!"));
        }
    }

    static async clientGameVersionValidate(request = null, reply = null) {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    }

    static async clientGameConfig(request = null, reply = null) {
        const sessionID = await FastifyResponse.getSessionID(request);
        const responseObject = {
            aid: sessionID,
            lang: "en",
            languages: await Language.getAllWithoutKeys(),
            ndaFree: false,
            taxonomy: 6,
            activeProfileId: `pmc${sessionID}`,
            backend: {
                Trading: FastifyResponse.getBackendUrl(),
                Messaging: FastifyResponse.getBackendUrl(),
                Main: FastifyResponse.getBackendUrl(),
                RagFair: FastifyResponse.getBackendUrl()
            },
            utc_time: await getCurrentTimestamp(),
            totalInGame: 0,
            reportAvailable: true,
            twitchEventMember: false
        };
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(responseObject));
    }

    static async clientGameKeepAlive(request = null, reply = null) {
        let msg = "OK";

        const sessionID = await FastifyResponse.getSessionID(request);
        if (typeof sessionID == "undefined") msg = "No Session";

        // traders assorts
        const traders = await Trader.getAllWithoutKeys();
        const currentTime = await getCurrentTimestamp();
        for (const trader of traders) {
            await trader.generateAssort(currentTime);
        }

        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(
            { msg: msg, utc_time: await getCurrentTimestamp() }
        ));
    }

    // TODO: QuestController
    static async clientGameProfileAcceptQuest(moveAction = null, _reply = null, playerProfile = null) {
        const quest = await Quest.get(moveAction.qid);
        const questReward = await quest.getRewards(playerProfile, "Started");
        await playerProfile.character.addQuest(quest);
        const userAccount = await Account.get(playerProfile.id);
        const userLanguage = userAccount.getLanguage();
        const locales = await Locale.get(userLanguage);
        const questLocale = await locales.getQuestLocales(quest._id);
        const messageContent = {
            templateId: questLocale.startedMessageText,
            type: 10,
            maxStorageTime: database.core.gameplay.other.RedeemTime * 3600
        };
        await playerProfile.addDialogue(quest.traderId, messageContent, questReward);
        return {};
    }

    static async clientGameProfileReadEncyclopedia(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    }

    static async clientGameProfileResetWishList(moveAction = null, _reply = null, playerProfile = null) {
        if (playerProfile) {
            logger.logConsole(moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.WishList = [];
            await playerPMC.save();
        }
    }

    static async clientGameProfileCustomizationBuy(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            if (moveAction.items.length > 0) {
                const itemTaken = await playerProfile.character.removeItem(moveAction.items[0].id, moveAction.items[0].count);
                if (!itemTaken) {
                    logger.logError(`[clientGameProfileCustomizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
                    return output;
                }
                output.items.change = itemTaken.changed;
                output.items.removed = itemTaken.removed;
            }
            const customizationSuit = await Customization.getCustomizationByTraderOfferId(moveAction.offer);
            await playerProfile.addCustomization(customizationSuit._id);
        }
        return output;
    }

    static async clientGameProfileCustomizationWear(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        // not sure if anything is  needed in output, working so far
        if (playerProfile) {
            for (const suit of moveAction.suites) {
                const customizationSuit = await Customization.get(suit);
                await playerProfile.character.wearSuit(customizationSuit);
            }
        }
        return output;
    }

    // ApplyInventoryChanges

    static async clientGameApplyInventoryChanges(moveAction = null, _reply = null, playerProfile = null) {

        // Changed Items //
        for (const inventoryChange of moveAction.changedItems) {
            let item = await playerProfile.character.getInventoryItemByID(inventoryChange._id);
            if(item) {
                Object.assign(item, inventoryChange);
            } else {
                logger.logError(`[clientGameApplyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
            }
        }
    }
}
module.exports.GameController = GameController;

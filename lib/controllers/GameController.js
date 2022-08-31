const { Profile } = require('../models/Profile');
const { Language } = require('../models/Language');
const { Account } = require('../models/Account');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Locale } = require('../models/Locale');
const { Trader } = require('../models/Trader');
const { getCurrentTimestamp, logger, FastifyResponse } = require("../../utilities");
const { Dialogue } = require('../models/Dialogue');

class GameController {

    // Game //
    static async clientGameStart(request, reply) {
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

    static async clientGameVersionValidate(request, reply) {
        logger.logInfo("Client connected with version: " + request.body.version.major);
        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    }

    static async clientGameConfig(request, reply) {
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

    static async clientGameKeepAlive(request, reply) {
        const sessionID = await FastifyResponse.getSessionID(request);

        let msg = "OK";
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
    static async clientGameProfileAcceptQuest(moveAction, playerProfile, sessionID) {
        const { database: { core: { gameplay: { other: { RedeemTime } } } } } = require('../../app');

        const quest = await Quest.get(moveAction.qid);
        const questReward = await quest.getRewards(playerProfile, "Started");
        await playerProfile.character.addQuest(quest);

        const { lang } = await Account.get(playerProfile.id);
        const locales = await Locale.get(lang);


        const questLocale = await locales.getQuestLocales(quest._id);

        const messageContent = await Dialogue.createMessageContent(
            questLocale.description,
            10,
            (RedeemTime * 3600))
        await playerProfile.addDialogue(quest.traderId, messageContent, sessionID, questReward);
        return {};
    }

    static async clientGameProfileReadEncyclopedia(moveAction, playerProfile) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    }

    static async clientGameProfileResetWishList(moveAction, playerProfile) {
        if (playerProfile) {
            logger.logConsole(`[ResetWishList]` + moveAction);
            const playerPMC = await playerProfile.getPmc();
            playerPMC.WishList = [];
            await playerPMC.save();
        }
    }

    static async clientGameProfileCustomizationBuy(moveAction, playerProfile) {
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

    static async clientGameProfileCustomizationWear(moveAction, playerProfile) {
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

    static async clientGameApplyInventoryChanges(moveAction, playerProfile) {

        // Changed Items //
        for (const inventoryChange of moveAction.changedItems) {
            let item = await playerProfile.character.getInventoryItemByID(inventoryChange._id);
            if (item) {
                Object.assign(item, inventoryChange);
            } else {
                logger.logError(`[clientGameApplyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
            }
        }
    }
}
module.exports.GameController = GameController;

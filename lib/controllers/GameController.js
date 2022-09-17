const { Language } = require('../models/Language');
const { Account } = require('../models/Account');
const { Profile } = require('../models/Profile');
const { Customization } = require('../models/Customization');
const { Quest } = require('../models/Quest');
const { Locale } = require('../models/Locale');
const { Trader } = require('../models/Trader');
const { Dialogue } = require('../models/Dialogue');
const { Item } = require('../models/Item')

const { TaskerController } = require("./TaskerController");

const { getCurrentTimestamp, logger, FastifyResponse, min, findAndChangeHandoverItemsStack } = require("../../utilities");


class GameController {

    // Game //
    static async clientGameStart(request, reply) {
        const playerProfile = await Profile.get(await FastifyResponse.getSessionID(request));
        if (playerProfile) {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(
                    { utc_time: getCurrentTimestamp() },
                    0,
                    null
                )
            );
        } else {
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(
                    { utc_time: getCurrentTimestamp() },
                    999,
                    "Profile Not Found!!"
                )
            );
        }
    }

    static async clientGameVersionValidate(request, reply) {
        logger.info("Client connected with version: " + request.body.version.major);
        return FastifyResponse.zlibJsonReply
            (
                reply,
                FastifyResponse.applyBody(null)
            );
    }

    static async clientGameConfig(request, reply) {
        const sessionID = await FastifyResponse.getSessionID(request);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody({
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
                utc_time: getCurrentTimestamp(),
                totalInGame: 0,
                reportAvailable: true,
                twitchEventMember: false
            })
        );
    }

    static async clientGameKeepAlive(request, reply) {
        const sessionID = await FastifyResponse.getSessionID(request);

        let msg = "OK";
        if (typeof sessionID === "undefined") msg = "No Session";

        // traders assorts
        const traders = await Trader.getAllWithoutKeys();
        const currentTime = getCurrentTimestamp();
        for (const trader of traders) {
            await trader.generateAssort(currentTime);
        }

        await TaskerController.runTasks(sessionID);
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(
                {
                    msg: msg,
                    utc_time: currentTime
                })
        );
    }

    // QuestController
    static async clientGameProfileAcceptQuest(moveAction, playerProfile) {
        const output = {};
        const quest = await Quest.get(moveAction.qid);
        const questReward = await quest.processQuestRewards(output, playerProfile.character, "Started");
        await playerProfile.character.addQuest(quest);

        const generatedDialogue = await quest.generateQuestDialogMessage(
            playerProfile.character, questReward, await Dialogue.getMessageTypeByName("QuestStart"), "description");
        await playerProfile.sendNotificationMessage(generatedDialogue, playerProfile.character.aid);

        await quest.setUnlockedBasedOnStatus(output, playerProfile.character, "Started");
        return output;
    }

    static async clientGameProfileHandoverQuest(moveAction, playerProfile) {
        const { conditions } = await Quest.get(moveAction.qid); //get conditions from quest
        const condition = conditions.AvailableForFinish.find( // find and return _props
            c => c._props.id === moveAction.conditionId)._props;

        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };

        const handoverValue = (Number(condition.value) - ( // subtract character quest value from condition value
            (playerProfile.character.BackendCounters[condition.id]) ? //check if condition exists, return value or 0
                playerProfile.character.BackendCounters[condition.id].value : 0))

        if (handoverValue <= 0) return output;

        let counter = 0;
        let amountToRemove = 0;

        for (const handover of moveAction.items) {
            amountToRemove = min(handover.count, handoverValue - counter);
            counter += amountToRemove;

            if (handover.count - amountToRemove > 0) {
                await findAndChangeHandoverItemsStack(
                    playerProfile.character,
                    handover.id,
                    (handover.count - amountToRemove),
                    output);

                if (counter === handoverValue) break;
            } else {
                const remove = await Item.findAndReturnChildrenAsIds(handover.id, playerProfile.character.Inventory.items);
                let length = playerProfile.character.Inventory.items.length;

                output.items.del.push({
                    "_id": handover.id
                });

                while (length-- > 0) {
                    if (remove.includes(playerProfile.character.Inventory.items[length]._id)) {
                        playerProfile.character.Inventory.items.splice(length, 1);
                    }
                }
            }
        }

        await playerProfile.updateBackendCounters(moveAction.conditionId, moveAction.qid, counter);
        return output;
    }

    static async clientGameProfileCompleteQuest(moveAction, playerProfile) {
        const output = {};

        const questData = await Quest.get(moveAction.qid);

        const character = await playerProfile.getPmc();
        const characterQuest = await character.getQuest(moveAction.qid);
        await character.updateQuest(moveAction.qid, "Success");


        const rewards = await questData.processQuestRewards(output, character, characterQuest.status)
        const failedQuests = await questData.findAndReturnFailedQuestsUponQuestComplete(moveAction.qid);
        if (failedQuests !== 0) await questData.processFailedQuests(output, character, failedQuests);

        const generatedDialogue = await questData.generateQuestDialogMessage(
            character, rewards, await Dialogue.getMessageTypeByName("QuestSuccess"), "successMessageText");

        await playerProfile.sendNotificationMessage(generatedDialogue, character.aid);

        await questData.processQuestListForOutput(output, await Quest.getQuestsForPlayer(playerProfile));

        return output;
    }

    static async clientGameProfileReadEncyclopedia(moveAction, playerProfile) {
        if (playerProfile) {
            for (const id of moveAction.ids) {
                playerProfile.character.Encyclopedia[id] = true;
            }
        }
    }

    static async clientGameProfileResetWishList(moveAction, playerProfile) {
        if (playerProfile.character) {
            logger.console(`[ResetWishList]` + moveAction);
            playerProfile.character.WishList = [];
            await playerProfile.save();
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
                    logger.error(`[clientGameProfileCustomizationBuy] Couldn't take money with id ${moveAction.items[0].id}`);
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
                logger.error(`[clientGameApplyInventoryChanges] Couldn't find item with id ${inventoryChange._id}`);
            }
        }
    }
}
module.exports.GameController = GameController;

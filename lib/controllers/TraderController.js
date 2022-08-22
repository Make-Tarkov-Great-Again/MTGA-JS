const { Trader } = require('../models/Trader');
const { Account } = require('../models/Account');
const { Item } = require('../models/Item');
const { Ragfair } = require('../models/Ragfair');
const { RagfairOffer } = require('../models/RagfairOffer');
const { FastifyResponse, logger } = require("../../utilities");
const { database } = require("../../app");


class TraderController {

    static async clientTradingApiGetTradersInfo(_request = null, reply = null) {
        const traders = [];
        for (const [traderID, trader] of Object.entries(await Trader.getAll())) {
            if (trader.isRagfair())
                continue;
            traders.push(trader.base);
        }
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(traders));
    }

    static async clientTradingCustomizationStorage(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const storageData = await profile.getStorage();
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(storageData));
    }

    static async getTraderAssort(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const traderId = request.params.traderId
        const trader = await Trader.get(traderId);
        const res = await trader.getFilteredAssort(profile);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(res));
    }

    static async getTraderOutfitOffers(request = null, reply = null) {
        const trader = await Trader.get(request.params.id);
        logger.logInfo(`Shows outfits for all sides, we'll decide if we care or not`);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(trader.suits));
    }

    static async getUserAssortPrice(request = null, reply = null) {
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const profile = await playerAccount.getProfile();
        const traderId = request.params.traderId;
        const trader = await Trader.get(traderId);
        return FastifyResponse.zlibJsonReply(reply, FastifyResponse.applyBody(await trader.getPurchasesData(profile)));
    }

    static async traderRepair(moveAction = null, _reply = null, playerProfile = null) {
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (playerProfile) {
            const itemToRepair = await playerProfile.character.getInventoryItemByID(moveAction.repairItems[0]._id);
            if (!itemToRepair) {
                logger.logError(`[traderRepair] Couldn't find item with id ${moveAction.item}`);
                return output;
            }
            const trader = await Trader.get(moveAction.tid);
            const loyalty = await playerProfile.getLoyalty(trader.base._id, trader.base);
            const itemTemplate = await Item.get(itemToRepair._tpl);
            const coef = 1 + ((trader.base.loyaltyLevels[loyalty].repair_price_coef) / 100);
            let repairCost = Math.round(itemTemplate._props.RepairCost * moveAction.repairItems[0].count * coef);
            const moneyItems = await playerProfile.character.getInventoryItemsByTpl(trader.base.repair.currency);
            for (const moneyStack of moneyItems) {
                if (moneyStack.upd.StackObjectsCount < repairCost) {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    repairCost -= moneyStack.upd.StackObjectsCount;
                } else {
                    const itemTaken = await playerProfile.character.removeItem(moneyStack._id, repairCost);
                    output.items.del.push(...itemTaken.removed);
                    output.items.change.push(...itemTaken.changed);
                    break;
                }
            }
            // new max durability
            const amountRepaired = Math.round(Math.min(Math.max(itemToRepair.upd.Repairable.Durability + moveAction.repairItems[0].count, 0), itemToRepair.upd.Repairable.MaxDurability));
            itemToRepair.upd.Repairable.Durability = amountRepaired;
            itemToRepair.upd.Repairable.MaxDurability = amountRepaired;
            output.items.change.push(itemToRepair);
        }
        return output;
    }

    static async tradingConfirm(moveAction = null, _reply = null, playerProfile = null) {
        logger.logDebug("[clientGameProfileTradingConfirm] Trading request:");
        logger.logDebug(moveAction);
        const output = {
            items: {
                new: [],
                change: [],
                del: []
            }
        };
        if (moveAction.type === 'buy_from_trader') {
            const trader = await Trader.get(moveAction.tid);
            const traderItem = await trader.getAssortItemByID(moveAction.item_id);
            const traderAssort = await trader.getFilteredAssort(playerProfile);
            const traderItemChildren = await traderItem.getAllChildItemsInInventory(traderAssort.items);
            const traderItemTemplate = await Item.get(traderItem._tpl);

            let preparedChildren = false;
            if (traderItemChildren) {
                preparedChildren = await Item.prepareChildrenForAddItem(traderItem, traderItemChildren);
            } else {
                // Handle Ammoboxes //
                if (traderItemTemplate._parent === "543be5cb4bdc2deb348b4568") {
                    if (typeof traderItemTemplate._props.StackSlots !== "undefined") {
                        preparedChildren = []
                        for (const stackedSlot of traderItemTemplate._props.StackSlots) {
                            const childToAdd = {
                                "_tpl": stackedSlot._props.filters[0].Filter[0],
                                "slotId": stackedSlot._name,
                                "upd": {
                                    "StackObjectsCount": stackedSlot._max_count
                                }
                            };
                            preparedChildren.push(childToAdd);
                        }
                    }
                }
            }
            // Merge existing item to reach max stack
            let itemsAdded;
            let itemsMerged;
            let remainingStack = moveAction.count;
            const maxStack = await traderItemTemplate.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(traderItemTemplate._id);
                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(existingStacks, maxStack, moveAction.count);
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), traderItem._tpl, preparedChildren, remainingStack);
            }
            if (itemsAdded || itemsMerged) {
                if (itemsAdded) {
                    output.items.new = itemsAdded;
                }
                if (itemsMerged) {
                    output.items.change = itemsMerged;
                }
                for (const scheme of moveAction.scheme_items) {
                    const itemsTaken = await playerProfile.character.removeItem(scheme.id, scheme.count);
                    if (itemsTaken) {
                        if (typeof itemsTaken.changed !== "undefined") {
                            output.items.change = output.items.change.concat(itemsTaken.changed);
                        }

                        if (typeof itemsTaken.removed !== "undefined") {
                            output.items.del = output.items.del.concat(itemsTaken.removed);
                        }
                    } else {
                        logger.logError(`[clientGameProfileTradingConfirm] Unable to take items`);
                    }
                    await trader.removeItemFromAssortAfterBuy(moveAction);
                    const ragfair = await Ragfair.get("FleaMarket");
                    const ragfairOffer = await RagfairOffer.getOfferByItemId(moveAction.item_id, ragfair.offers);
                    if (ragfairOffer) {
                        if (ragfairOffer.buyRestrictionMax) {
                            ragfairOffer.buyRestrictionCurrent += moveAction.count;
                        }
                    }
                }
            } else {
                logger.logDebug(`[clientGameProfileTradingConfirm] Unable to add items`);
            }
            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else if (moveAction.type === 'sell_to_trader') {
            const trader = await Trader.get(moveAction.tid);
            // TODO: LOAD TRADER PLAYER LOYALTY FOR COEF
            let itemPrice = 0;
            for (const itemSelling of moveAction.items) {
                logger.logDebug(itemSelling);
                const item = await playerProfile.character.getInventoryItemByID(itemSelling.id);
                const currentItemPrice = database.templates.PriceTable[item._tpl];
                itemPrice += currentItemPrice * itemSelling.count;
                await playerProfile.character.removeItem(item._id);
                output.items.del.push({ _id: item._id });
            }
            // Merge existing item to reach max stack
            let itemsAdded = [];
            let itemsMerged = [];
            let remainingStack = itemPrice;
            const currency = await trader.getBaseCurrency();
            const itemModel = await Item.get(currency);
            const maxStack = await itemModel.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(itemModel._id);
                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(existingStacks, maxStack, remainingStack);
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(await playerProfile.character.getStashContainer(), currency, false, remainingStack);
            }
            output.items.new = itemsAdded;
            output.items.change = itemsMerged;
            logger.logDebug(output);
            logger.logDebug(output.items.change);
            logger.logDebug(output.items.new);

        } else if (moveAction.Action === 'RagFairBuyOffer') {
            const ragfair = await Ragfair.get("FleaMarket");
            const offer = await RagfairOffer.getById(moveAction.offers[0].id, ragfair.offers);
            const itemTemplate = await Item.get(offer.items[0]._tpl);

            let preparedChildren = false;
            if (offer.items.length > 0) {
                preparedChildren = await Item.prepareChildrenForAddItem(offer.items[0], offer.items);
            }

            // Merge existing item to reach max stack
            let itemsAdded;
            let itemsMerged;
            let remainingStack = moveAction.offers[0].count;
            const maxStack = await itemTemplate.getStackInfo();
            if (maxStack) {
                const existingStacks = await playerProfile.character.getInventoryItemsByTpl(itemTemplate._id);

                [itemsMerged, remainingStack] = await playerProfile.character.addItemToStack(
                    existingStacks,
                    maxStack,
                    moveAction.offers[0].count
                );
            }
            if (remainingStack) {
                itemsAdded = await playerProfile.character.addItem(
                    await playerProfile.character.getStashContainer(),
                    offer.items[0]._tpl,
                    preparedChildren,
                    remainingStack
                );
            }
            if (itemsAdded || itemsMerged) {
                if (itemsAdded) {
                    output.items.new = itemsAdded;
                }
                if (itemsMerged) {
                    output.items.change = itemsMerged;
                }
                for (const scheme of moveAction.offers[0].items) {
                    const itemsTaken = await playerProfile.character.removeItem(
                        scheme.id,
                        scheme.count
                    );

                    if (itemsTaken) {
                        if (typeof itemsTaken.changed !== "undefined") {
                            output.items.change = output.items.change.concat(itemsTaken.changed);
                        }

                        if (typeof itemsTaken.removed !== "undefined") {
                            output.items.del = output.items.del.concat(itemsTaken.removed);
                        }
                    } else {
                        logger.logError(`[clientGameProfileTradingConfirm] Unable to take items`);
                    }
                    if (await offer.isTraderOffer()) {
                        if (offer.buyRestrictionMax) {
                            offer.buyRestrictionCurrent += moveAction.offers[0].count;
                            const trader = await Trader.get(offer.user.id);
                            await trader.removeItemFromAssortAfterBuy({item_id: offer.root, count: moveAction.offers[0].count});
                        }
                    }
                }
            } else {
                logger.logError(`[clientGameProfileTradingConfirm] Unable to add items`);
            }

            logger.logDebug(output);
            logger.logDebug(output.items);
            logger.logDebug(output.items.change[0].upd);
        } else {
            logger.logError(`[clientGameProfileTradingConfirm] My brother in christ what are you trying to do ? ${moveAction.type} ? That shit is not done lmao pay me now.`);
        }
        return output;
    }

}
module.exports.TraderController = TraderController;

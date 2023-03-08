/* 
import { Profile } from '../models/Profile';
import { Ragfair } from '../models/Ragfair';
import { RagfairOffer } from '../models/RagfairOffer'; 
*/

import { database } from '../../app.mjs';
import { Trade } from '../classes/Trade.mjs';
import { Trader, Item, Profile, Storage, Character, Inventory, Ragfair } from '../classes/_index.mjs';

import { Response, logger, stringify } from "../utilities/_index.mjs";

export class TraderController {

    static async clientItemPrices(request, reply) {
        const resupplyTime = await Trader.updateResupply(request.params.trader);
        const prices = {
            supplyNextTime: resupplyTime,
            prices: database.templates.priceTable,
            currencyCourses: {
                "5449016a4bdc2d6f028b456f": 1,
                "569668774bdc2da2298b4568": 116,
                "5696686a4bdc2da3298b456a": 111
            }
        }

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(prices)
        );
    }

    static async clientTradingApiGetTradersInfo(reply) {
        const { globals } = database.core;
        const traders = await Object.values(Trader.getAll())
            .reduce(async (output, trader) => {
                if (!Trader.isRagfair(trader)) {

                    if (globals.config.EventType.includes("Halloween")) {
                        const avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", "_h.png")
                            : trader.base.avatar;
                        trader.base.avatar = avatar;
                    } else {
                        const avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", ".png")
                            : trader.base.avatar;
                        trader.base.avatar = avatar;
                    }
                    /* Temporarily disabled until there are Christmas trader icons
                    else if (globals.config.EventType.includes("Christmas")) {
                        trader.base.avatar = trader.base.avatar.indexOf(".jpg")
                            ? trader.base.avatar.replace(".jpg", "_c.png")
                            : trader.base.avatar.replace(".png", "_c.png")
                    }
                    */


                    (await output).push(trader.base);
                }
                return output;
            }, []);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(traders)
        );
    }

    static async clientTradingCustomizationStorage(sessionID, reply) {
        const storage = Storage.get(sessionID);
        const data = {
            _id: storage._id,
            suites: storage.suites
        };

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(data)
        );
    }

    static async getTraderAssort(request, reply) {
        const sessionID = await Response.getSessionID(request);
        const character = Character.get(sessionID);
        const output = await Trader.generateFilteredAssort(character, request.params.traderId);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(output)
        );
    }

    static async getTraderOutfitOffers(request, reply) {
        const { suits } = Trader.get(request.params.id);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(suits)
        );
    }

    /*     static async getUserAssortPrice(request, reply) {
            const playerProfile = await Profile.get(await Response.getSessionID(request));
            const trader = await Trader.get(request.params.traderId);
            const purchasesData = await trader.getPurchasesData(playerProfile);
    
            return Response.zlibJsonReply(
                reply,
                await Response.applyBody(purchasesData)
            );
        } */

    static async confirmTrade(moveAction, character, characterChanges) {
        switch (moveAction.Action) {
            case "TradingConfirm":
                switch (moveAction.type) {
                    case "buy_from_trader":
                        await this.buyFromTrader(moveAction, character, characterChanges);
                        break;

                    case "sell_to_trader":
                        await this.sellToTrader(moveAction, character, characterChanges);
                        break;

                    default:
                        logger.error(`[confirmTrade/TradingConfirm] ${moveAction.type} is not handled`);
                        break;
                }
                break;
            case "RagFairBuyOffer":
                await this.buyFromFlea(moveAction, character, characterChanges);
                break;

            default:
                if (moveAction.type)
                    logger.error(`[confirmTrade] ${moveAction.Action} ${moveAction.type} is not handled!`);
                else
                    logger.error(`[confirmTrade] ${moveAction.Action} is not handled!`);
                break;
        }
    }

    static async buyFromTrader(moveAction, character, characterChanges) {
        const assort = Trader.getAssort(moveAction.tid);
        const purchase = await Trader.getAssortItemByID(assort, moveAction.item_id);

        const itemData = Item.get(purchase._tpl);

        // Merge existing item to reach max stack
        const [itemsAdded, itemsMerged] = await this.purchaseOffer(character, purchase, itemData, assort, moveAction.count);
        if (itemsAdded.length !== 0 || itemsMerged.length !== 0) {
            let price = 0;
            for (const scheme of moveAction.scheme_items) {
                const confirmed = await Trade.typeOfPurchase(character.Inventory, characterChanges, scheme.id, scheme.count);
                if (!confirmed) {
                    return logger.error("[buyFromTrader] Purchase failed because traded for item doesn't exist in your Inventory");
                }

                await Trader.removeItemFromAssortAfterBuy(assort, moveAction);
                const { offers } = Ragfair.get();
                const offer = await Ragfair.getOfferByItemId(moveAction.item_id, offers);
                if (offer && offer.buyRestrictionMax)
                    offer.buyRestrictionCurrent += moveAction.count;

                price += scheme.count;
            }

            if (itemsAdded.length !== 0)
                characterChanges.items.new.push(...itemsAdded);
            if (itemsMerged.length !== 0)
                characterChanges.items.change.push(...itemsMerged);

            const traderRelations = {
                [moveAction.tid]: {
                    salesSum: price
                }
            };
            characterChanges.traderRelations.push(traderRelations);

        } else {
            logger.warn(`[buyFromTrader] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
        }
    }

    // probably can rename to `addPurchaseToInventory`    
    static async purchaseOffer(character, item, itemData, assort, amountPurchased) {
        const itemsMerged = [];

        const amountToAdd = await this.mergeItems(character.Inventory, itemData, amountPurchased, itemsMerged);

        let itemsAdded = [];
        if (amountToAdd > 0) {
            const stashContainerID = await Inventory.getStashContainer(character.Inventory);
            const stashContainer = await Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
            const children = await Item.getAllChildItemsInInventory(item, assort.items);

            itemsAdded = await Inventory.addItemToInventory(
                character,
                stashContainer,
                item._id,
                itemData,
                amountPurchased,
                children
            );
        }
        return [itemsAdded, itemsMerged];
    }

    /**
     * Checks if item can be merged into existing Item stacks in character Inventory, returns remainder
     * @param {*} characterInventory inventory of specified character
     * @param {*} itemData data of item received from Item.get(itemID)
     * @param {*} amountToMerge amount of items to merge
     * @param {*} itemsMerged array to return to client to know what was merged
     * @returns 
     */
    static async mergeItems(characterInventory, itemData, amountToMerge, itemsMerged) {
        const maxStack = Item.getStackInfo(itemData);
        if (!maxStack)
            return amountToMerge;

        const existingStacks = await Inventory.getInventoryItemsByTpl(characterInventory, itemData._id);
        if (!existingStacks)
            return amountToMerge;

        return Inventory.addItemToStack(itemsMerged, existingStacks, maxStack, amountToMerge);
    }

    static async sellToTrader(moveAction, character, characterChanges) {
        for (const itemSelling of moveAction.items) {
            const item = await Inventory.getInventoryItemByID(character.Inventory, itemSelling.id);
            await Inventory.removeItem(character.Inventory, characterChanges, item._id, itemSelling.count);
        }

        // Merge existing item to reach max stack
        let itemsMerged = [];
        const currency = Trader.getBaseCurrency(await Trader.get(moveAction.tid));
        const currencyData = Item.get(currency);
        const amountToAdd = await this.mergeItems(character.Inventory, currencyData, moveAction.price, itemsMerged);


        let itemsAdded = [];
        if (amountToAdd) {
            const containerId = Inventory.getStashContainer(character.Inventory);
            const container = await Inventory.getInventoryItemByID(character.Inventory, containerId);
            itemsAdded = await Inventory.addItemToInventory(character, container, currencyData._id, currencyData, amountToAdd);
        }

        if (itemsAdded.length !== 0)
            characterChanges.items.new.push(...itemsAdded);
        if (itemsMerged.length !== 0)
            characterChanges.items.change.push(...itemsMerged);

        const traderRelations = {
            [moveAction.tid]: {
                salesSum: moveAction.price
            }
        };
        characterChanges.traderRelations.push(traderRelations);
    }

    static async buyFromFlea(moveAction, character, characterChanges) {
        for (const actionOffer of moveAction.offers) {
            const ragfairOffer = await Ragfair.getOfferById(actionOffer.id);
            const itemData = Item.get(ragfairOffer.items[0]._tpl);

            const [itemsAdded, itemsMerged] = await this.purchaseOffer(character, ragfairOffer.items[0], itemData, ragfairOffer, actionOffer.count);
            if (!itemsAdded && !itemsMerged) {
                logger.error(`[clientGameProfileconfirmTrade] Unable to add item(s)`);
                return;
            }

            for (const scheme of actionOffer.items) {
                const confirmed = await Trade.typeOfPurchase(character.Inventory, characterChanges, scheme.id, scheme.count);
                if (!confirmed) {
                    return logger.error("[buyFromTrader] Purchase failed because traded for item doesn't exist in your Inventory");
                }
                if (await ragfairOffer.isTraderOffer()) {
                    if (ragfairOffer.buyRestrictionMax) {
                        ragfairOffer.buyRestrictionCurrent += actionOffer.count;
                        const trader = await Trader.get(ragfairOffer.user.id);
                        await Trader.removeItemFromAssortAfterBuy(trader.assort, { item_id: ragfairOffer.root, count: actionOffer.count });
                    }
                }
            }
            characterChanges.items.new.push(...itemsAdded);
            characterChanges.items.change.push(...itemsMerged);
        }

    }
}

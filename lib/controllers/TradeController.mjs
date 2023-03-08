//import { database } from '../../app.mjs';
import { Trader, Trade, Item, Inventory, Ragfair } from '../classes/_index.mjs';

import { logger } from "../utilities/_index.mjs";

export class TradeController {

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

        //find existing stack to merge with before trying to create new item
        const itemsToMerge = characterChanges.items.change;
        const amountToAdd = await this.mergeTradedItems(character.Inventory, itemData, amountPurchased, itemsToMerge);
        if (amountToAdd === 0 && itemsToMerge !== 0) {
            //purchase successfully merged, pay for it
            const receipt = await this.payForTraderTrade(character.Inventory, characterChanges, moveAction);
            this.improveTraderTradeRelations(moveAction.tid, receipt, characterChanges);
            return;
        }

        const itemsToAdd = characterChanges.items.new;
        itemsToAdd.push(await this.processPurchase(character, purchase, itemData, assort, moveAction.count));
        if (itemsToAdd.length !== 0) {
            const receipt = await this.payForTraderTrade(character.Inventory, characterChanges, moveAction);
            this.improveTraderTradeRelations(moveAction.tid, receipt, characterChanges);
        } else {
            return logger.warn(`[buyFromTrader] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
        }
    }

    static async payForTraderTrade(characterInventory, characterChanges, moveAction) {
        let price = 0;
        for (const scheme of moveAction.scheme_items) { //moveAction.scheme_items (trader????) 
            if (!await Trade.typeOfPurchase(characterInventory, characterChanges, scheme.id, scheme.count)) {
                return logger.error("[buyFromTrader] Purchase failed because traded for item doesn't exist in your Inventory");
            }

            await Trader.removeItemFromAssortAfterBuy(assort, moveAction);
            const { offers } = Ragfair.get();
            const offer = await Ragfair.getOfferByItemId(moveAction.item_id, offers);
            if (offer && offer.buyRestrictionMax)
                offer.buyRestrictionCurrent += moveAction.count;

            price += scheme.count;
        }
        return price;
    }

    static improveTraderTradeRelations(traderId, salePrice, characterChanges) {
        characterChanges.traderRelations.push({
            [traderId]: {
                salesSum: salePrice
            }
        });
    }

    // probably can rename to `addPurchaseToInventory`    
    static async processPurchase(character, item, itemData, assort, amountPurchased) {
        const stashContainerID = await Inventory.getStashContainer(character.Inventory);
        const stashContainer = await Inventory.getInventoryItemByID(character.Inventory, stashContainerID);
        const children = await Item.getAllChildItemsInInventory(item, assort.items);

        return Inventory.addItemToInventory(
            character,
            stashContainer,
            item._id,
            itemData,
            amountPurchased,
            children
        );
    }

    /**
     * Checks if item can be merged into existing Item stacks in character Inventory, returns remainder
     * @param {*} characterInventory inventory of specified character
     * @param {*} itemData data of item received from Item.get(itemID)
     * @param {*} amountToMerge amount of items to merge
     * @param {*} itemsMerged array to return to client to know what was merged
     * @returns 
     */
    static async mergeTradedItems(characterInventory, itemData, amountToMerge, itemsMerged) {
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
        const amountToAdd = await this.mergeTradedItems(character.Inventory, currencyData, moveAction.price, itemsMerged);


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
        for (const offer of moveAction.offers) {
            const listedOffer = await Ragfair.getOfferById(offer.id);
            const itemData = Item.get(listedOffer.items[0]._tpl);

            const itemsToMerge = characterChanges.items.change;
            const amountToAdd = await this.mergeTradedItems(character.Inventory, itemData, amountPurchased, itemsToMerge);
            if (amountToAdd === 0 && itemsToMerge !== 0) {
                //purchase successfully merged, pay for it
                await this.payForFleaTrade(character.Inventory, characterChanges, offer, listedOffer);
                continue;
            }

            //listedOffer.items[0]
            const itemsToAdd = characterChanges.items.new;
            itemsToAdd.push(await this.processPurchase(character, listedOffer.items[0], itemData, assort, moveAction.count));
            if (itemsToAdd.length !== 0) {
                await this.payForFleaTrade(character.Inventory, characterChanges, offer, listedOffer);
            } else {
                return logger.warn(`[buyFromTrader] Unable to add trader offer ${moveAction.item_id} because you're broke!!!!`);
            }

        }
    }

    static async payForFleaTrade(characterInventory, characterChanges, offer, listedOffer) {
        for (const scheme of offer.items) { //payTrade function needs to be modified for this
            if (!await Trade.typeOfPurchase(characterInventory, characterChanges, scheme.id, scheme.count)) {
                return logger.error("[buyFromFlea] Purchase failed because traded for item doesn't exist in your Inventory");
            }
            if (listedOffer.isTraderOffer()) {
                if (listedOffer.buyRestrictionMax) {
                    listedOffer.buyRestrictionCurrent += offer.count;
                    await Trader.removeItemFromAssortAfterBuy(
                        Trader.getAssort(listedOffer.user.id),
                        { item_id: listedOffer.root, count: offer.count }
                    );
                }
                this.improveTraderTradeRelations(listedOffer.user.id, scheme.count, characterChanges);
            }
        }
    }
}

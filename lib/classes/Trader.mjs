import { database } from "../../app.mjs";
import { getCurrentTimestamp, stringify, writeFile } from "../utilities/_index.mjs";
import { Character } from "./Character.mjs";
import { RagfairOffer } from "./RagfairOffer.mjs";
import { Customization } from "./Customization.mjs";
import { Item } from "./Item.mjs";

export class Trader {

    static getAll() {
        return database.traders;
    }

    static get(traderID) {
        if (!database.traders[traderID]) {
            logger.error(`${traderID} is an invalid Trader ID`);
            return false;
        }
        return database.traders[traderID];
    }

    static getTraderName(traderID) {
        return {
            "54cb50c76803fa8b248b4571": "Prapor",
            "54cb57776803fa99248b456e": "Therapist",
            "579dc571d53a0658a154fbec": "Fence",
            "58330581ace78e27b8b10cee": "Skier",
            "5935c25fb3acc3127c3d8cd9": "Peacekeeper",
            "5a7c2eca46aef81a7ca2145d": "Mechanic",
            "5ac3b934156ae10c4430e83c": "Ragman",
            "5c0647fdd443bc2504c2d371": "Jaeger"
        }[traderID];
    }

    static getBaseCurrency(trader) {
        switch (trader.base.currency) {
            case "EUR":
                return "569668774bdc2da2298b4568";
            case "USD":
                return "5696686a4bdc2da3298b456a";
            case "RUB":
                return "5449016a4bdc2d6f028b456f";
            default:
                logger.error(`${trader.base.currency} not handled`);
        }
    }

    static async getResupply(traderID) {
        const { trading } = database.core.gameplay;
        const currentTime = getCurrentTimestamp();

        if (!database.core.resupply[traderID] || database.core.resupply[traderID] <= currentTime) {
            const resupplyTime = (currentTime + trading.refreshTimeInMinutes * 60);
            database.core.resupply[traderID] = resupplyTime;

            return database.core.resupply[traderID];
        }
        else
            return database.core.resupply[traderID];
    }

    static async updateResupply(traderID) {
        const { resupply } = database.core;

        const original = stringify(resupply); //cache current resupply

        const resupplyTime = await this.getResupply(traderID);

        const current = stringify(resupply); //cache potentially updated resupply
        if (original !== current) {
            const resupplyPath = `./assets/database/configs/resupply.json`;
            await writeFile(resupplyPath, current);
        }

        return resupplyTime;
    }

    static async checkResupply(traderID) {
        const currentTime = getCurrentTimestamp();
        if (!database.core.resupply[traderID]) {
            return await this.updateResupply(traderID) <= currentTime;
        }
        return database.core.resupply[traderID] <= currentTime;
    }

    static getBase(traderID) {
        return database.traders[traderID].base;
    }

    static getAssort(traderID) {
        return database.traders[traderID].assort;
    }

    static setAssort(traderID, newAssort) {
        database.traders[traderID].assort = newAssort;
    }

    static getSuits(traderID) {
        return database.traders[traderID].suits;
    }

    static async getByName(name) {
        for (const trader of database.traders) {
            if (trader.base.nickname === name)
                return database.traders[trader.base._id];
        }
        return false;
    }

    /**
     * Return Customization instance using the id of the trader offer.
     * @param {string} offerID
     * @returns {Promise<Customization>}
     */
    static async getCustomizationByTraderOfferId(offerID) {
        const traders = this.getAll();

        for (const trader in traders) {
            if (!traders[trader].suits)
                continue;
            for (const offer of traders[trader].suits) {
                if (offer._id === offerID) {
                    const suite = Customization.getWithId(offer.suiteId);
                    return { traderID: trader, suite: suite };
                }
            }

        }
        return false;
    }

    static async getAssortItemByID(assort, itemId) {
        return assort.items.find(item => item._id === itemId);
    }

    /**
    * Get the barter scheme for offer using its id
    * @param {string} itemId
    * @returns
    */
    static async getBarterSchemeById(itemID, traderAssort) {
        if (traderAssort.barter_scheme.hasOwnProperty(itemID))
            return traderAssort.barter_scheme[itemID][0];
        return "";
    }

    /**
    * Get the loyalty level for offer using its id
    * @param {string} itemId
    * @returns
    */
    static async getItemLoyalLevelById(itemID, traderAssort) {
        if (traderAssort.loyal_level_items.hasOwnProperty(itemID))
            return traderAssort.loyal_level_items[itemID];
        return "";
    }

    static async generateFilteredAssort(character, traderID) {
        const trader = this.get(traderID);
        if (trader?.assort && !await this.checkResupply(traderID)) {
            return trader.assort;
        }

        const output = {
            nextResupply: await this.updateResupply(traderID),
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };

        const loyalty = await Character.getLoyalty(character, traderID) + 1;

        if (this.isRagfair(trader)) {
            output.items = trader.assort.items;
            output.barter_scheme = trader.assort.barter_scheme;
            output.loyal_level_items = trader.assort.loyal_level_items;
        } else {
            for (const item of trader.baseAssort.items) {
                if (!trader.baseAssort.loyal_level_items[item._id] || trader.baseAssort.loyal_level_items[item._id] <= loyalty) {
                    output.items.push(item);

                    if (trader.baseAssort.barter_scheme[item._id]) {
                        output.barter_scheme[item._id] = trader.baseAssort.barter_scheme[item._id];
                    }

                    if (trader.baseAssort.loyal_level_items[item._id]) {
                        output.loyal_level_items[item._id] = trader.baseAssort.loyal_level_items[item._id];
                    }
                }
            }
        }

        this.setAssort(traderID, output);
        return output;
    }

    /**
     * Convert trader assort offers to the ragfair offer format
     */
    static async getRagfairOffers(trader) {
        const convertedOffers = [];
        let offerIntID = 1;

        for (const item of trader.assort.items) {
            if (item.slotId === "hideout") {
                const user = {
                    id: trader.base._id,
                    memberType: 4
                };

                const fullItem = {};
                fullItem.item = await Item.getParentAndChildren(item._id, trader.assort.items);
                fullItem.barter = await this.getBarterSchemeById(item._id, trader.baseAssort);
                fullItem.loyality = await this.getItemLoyalLevelById(item._id, trader.baseAssort);

                if (item.upd.BuyRestrictionMax)
                    convertedOffers.push(new RagfairOffer(offerIntID, fullItem, user, trader.assort.nextResupply,
                        { current: item.upd.BuyRestrictionCurrent, max: item.upd.BuyRestrictionMax }));
                else
                    convertedOffers.push(new RagfairOffer(offerIntID, fullItem, user, trader.assort.nextResupply));
                offerIntID += 1;
            }
        }
        return convertedOffers;
    }

    static isFence(trader) {
        return trader.base._id === "579dc571d53a0658a154fbec";
    }

    static isRagfair(trader) {
        return trader.base._id === "ragfair";
    }

    static async removeItemFromAssortAfterBuy(assort, moveAction) {
        const foundItem = await this.getAssortItemByID(assort, moveAction.item_id);
        if (foundItem) {
            if (foundItem.upd.BuyRestrictionMax) {
                foundItem.upd.BuyRestrictionCurrent += moveAction.count;
            }
            if (foundItem.upd.StackObjectsCount - moveAction.count > 0) {
                foundItem.upd.StackObjectsCount -= moveAction.count;
            } else {
                assort.items.splice(assort.items.indexOf(foundItem), 1);
            }
        } else {
            logger.error(`Could not find item to remove ${moveAction.item_id} in assort`);
        }
    }
}

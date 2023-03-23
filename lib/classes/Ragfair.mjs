import { database } from "../../app.mjs";

import { Item } from "./Item.mjs";
import { Trader } from "./Trader.mjs";
import { Account } from "./Account.mjs";
import { Preset } from "./Preset.mjs";
import { Locale } from "./Locale.mjs";

import {
    getCurrentTimestamp, generateMongoID, templatesWithParent,
    childrenCategories, isCategory, Response, cloneDeep
} from "../utilities/_index.mjs";

export class Ragfair {

    static get() {
        return database.flea;
    }

    static async getOfferById(id) {
        return database.flea.offers.find(offer => offer._id === id);
    }

    /**
     * Update the number of offers in the ragfair
     * @param {*} count
     */
    static setOffersCount(count) {
        database.flea.offersCount = count;
    }

    /**
     * Update the categories object which represent the amount of offers per category
     * @param {*} categories
     */
    static setCategories(categories) {
        database.flea.categories = categories;
    }


    /**
     * Remove offer with index from the offers array
     * @param {*} index
     */
    static async removeOfferWithIndex(index) {
        database.flea.offers.splice(index, 1);
        this.setOffersCount(database.flea.offers.length);
    }

    static async getOfferByItemId(itemId, offers) {
        return offers.find(offer => offer.root === itemId);
    }

    /**
     * Load all ragfair offers:
     * - remove expired,
     * - load traders offers,
     * - load player offers (TODO)
     * - refresh categories info
     */
    static async loadRagfairOffers(playerProfile) {
        if (database.flea.offersCount) {
            await this.removeExpired();
        }
        await this.loadTradersOffers(playerProfile);
        this.setOffersCount(database.flea.offers.length);
        this.setCategories(await Ragfair.generateAmountOffersPerCategories(database.flea.offers));
    }

    /**
     * Count the amount of offers per category
     * @returns object categories
     */
    static async generateAmountOffersPerCategories(offers, filters = false) {
        const categories = {};
        for (let i = 0, length = offers.length; i < length; i++) {
            const item = offers[i].items[0];
            if (filters) {
                if (filters.includes(item._tpl)) {
                    if (categories[item._tpl]) {
                        categories[item._tpl]++;
                        continue;
                    }
                    categories[item._tpl] = 1;
                }
            } 
            else {
                if (item._tpl in categories) {
                    categories[item._tpl]++;
                    continue;
                }
                categories[item._tpl] = 1;
            }
        }

        for (const category in categories) {
            if (!categories[category])
                categories[category] = 1;
        }

        return categories;
    }

    /**
     * Remove offers that are not in the categories, return filtered offers (if array)
     * @param {*} offers filter the offers based on the categories
     * @param {*} categories the categories to filter the offers
     * @returns
     */
    static async getOffersWithCategories(categories, offers) {
        return offers.filter(function (ragfairOffer) {
            return ragfairOffer.items[0]._tpl in categories;
        });
    }

    /**
     * @param {*} request
     * @returns
     */
    static async generateOffersBasedOnRequest(request, playerProfile) {
        await this.loadRagfairOffers(playerProfile);
        const output = { offers: await cloneDeep(database.flea.offers) };
        output.offers = await this.reduceOffersBasedOnFilterRequest(output.offers, request.body);
        if (request.body.neededSearchId) {
            const foundOffers = await this.getNeededFor(request.body.neededSearchId, output.offers);
            output.categories = await this.generateAmountOffersPerCategories(output.offers, await this.getCategoriesForOffers(foundOffers));
            output.offers = await this.getOffersWithCategories(output.categories, output.offers);
            // when the user click a categorie, we want to show only the items related to the categorie
            if (request.body.handbookId) {
                const categoriesFilter = await this.getTplFromHandbook(request.body.handbookId);
                const filteredCategories = await this.generateAmountOffersPerCategories(output.offers, categoriesFilter);
                output.offers = await this.getOffersWithCategories(filteredCategories, output.offers);
            }
        } else if (request.body.linkedSearchId) {
            output.categories = await this.generateAmountOffersPerCategories(output.offers, await this.getLinkedTo(request.body.linkedSearchId));
            output.offers = await this.getOffersWithCategories(output.categories, output.offers);
            // when the user click a categorie, we want to show only the items related to the categorie
            if (request.body.handbookId) {
                const categoriesFilter = await this.getTplFromHandbook(request.body.handbookId);
                const filteredCategories = await this.generateAmountOffersPerCategories(output.offers, categoriesFilter);
                output.offers = await this.getOffersWithCategories(filteredCategories, output.offers);
            }
        } else if (Object.keys(request.body.buildItems).length > 0) {
            output.categories = await this.generateAmountOffersPerCategories(output.offers, Object.keys(request.body.buildItems));
            output.offers = await this.getOffersWithCategories(output.categories, output.offers);

        } else {
            const categoriesFilter = await this.getTplFromHandbook(request.body.handbookId); // we get the sub categories from handbook (handbook = weapon by default)
            const filteredCategories = await this.generateAmountOffersPerCategories(output.offers, categoriesFilter); // we get the amount of offers per sub category
            output.categories = await this.generateAmountOffersPerCategories(output.offers, Object.keys(database.flea.categories)); // we want all categories to show
            output.offers = await this.getOffersWithCategories(filteredCategories, output.offers); // we get the offers with the current categories (handbook & subcategories)
        }
        output.offers = await this.sortOffers(request, output.offers);
        output.offersCount = output.offers.length;
        output.offers = output.offers.slice(request.body.page * request.body.limit, (request.body.page + 1) * request.body.limit);
        output.selectedCategory = request.body.handbookId;
        return output;
    }

    /**
     * Remove offers that expired, start from last offer
     */
    static async removeExpired() {
        for (let i = database.flea.offers.length - 1; i > -1; i--) {
            const offer = database.flea.offers[i];
            if (await offer.isExpired()) {
                await this.removeOfferWithIndex(i);
            }
        }
    }

    static async loadTradersOffers(playerProfile) {
        const traders = Trader.getAll();
        const timestamp = getCurrentTimestamp();
        for (const traderId in traders) {
            const trader = traders[traderId];
            if (!Trader.isFence(trader) && !Trader.isRagfair(trader)) {
                await Trader.generateFilteredAssort(playerProfile.character, traderId);
                if (trader.nextResupply < timestamp || !database.flea.offersCount) {
                    database.flea.offers = database.flea.offers.concat(await Trader.getRagfairOffers(trader));
                    Object.assign(database.flea.categories, trader.assort.loyal_level_items);
                }
            }
        }
    }
    static getCurrencyTemplateFromNumericalId(id) {
        const currencies = {
            1: "5449016a4bdc2d6f028b456f", // RUB
            2: "5696686a4bdc2da3298b456a", // USD
            3: "569668774bdc2da2298b4568"  // EUR
        };
        return currencies[id] ? currencies[id] : "5449016a4bdc2d6f028b456f";
    }
    static filterQuantityFrom(request, thisOfferObj) {
        return (request.quantityFrom > 0
            && typeof thisOfferObj.items[0].upd?.StackObjectsCount != 'undefined'
            && thisOfferObj.items[0].upd.StackObjectsCount < request.quantityFrom)
    }
    static filterQuantityTo(request, thisOfferObj) {
        return (request.quantityTo > 0
            && typeof thisOfferObj.items[0].upd?.StackObjectsCount != 'undefined'
            && thisOfferObj.items[0].upd.StackObjectsCount > request.quantityTo)
    }
    static filterConditionFrom(request, thisOfferObj) {
        return (request.conditionFrom > 0
            && typeof thisOfferObj.items[0].upd?.Repairable?.Durability != 'undefined'
            && thisOfferObj.items[0].upd.Repairable.Durability < request.conditionFrom)
    }
    static filterConditionTo(request, thisOfferObj) {
        return (request.conditionTo < 100
            && typeof thisOfferObj.items[0].upd?.Repairable?.Durability != 'undefined'
            && thisOfferObj.items[0].upd.Repairable.Durability > request.conditionTo)
    }

    static async reduceOffersBasedOnFilterRequest(offers, request) {
        const currentTime = getCurrentTimestamp(); // Get current time, in seconds since epoch
        for (let offerIndex = offers.length - 1; offerIndex > -1; offerIndex--) {
            const thisOfferObj = offers[offerIndex];
            //TODO: move each of those to independent functions of think of better way to do it...
            // Exclude offers if they meet any of these conditions
            if ((
                // If the request specifies a currency which doesn't match the currency for this offer
                request.currency != 0 && this.getCurrencyTemplateFromNumericalId(request.currency) != thisOfferObj.requirements[0]._tpl)
                // If this item's price is less than the requested priceFrom
                || (request.priceFrom > 0 && thisOfferObj.requirements[0].count < request.priceFrom)
                // If this item's price is greater than the requested priceTo
                || (request.priceTo > 0 && thisOfferObj.requirements[0].count > request.priceTo)
                // If this item's quantity is less than the requested quantityFrom
                || this.filterQuantityFrom(request, thisOfferObj)
                // If this item's quantity is greater than the requested quantityFrom
                || this.filterQuantityTo(request, thisOfferObj)
                // If this item's condition is less than the requested conditionFrom
                || this.filterConditionFrom(request, thisOfferObj)
                // If this item's condition is greater than the requested conditionTo
                || this.filterConditionTo(request, thisOfferObj)
                // If oneHourExpiration is true and the offer has more than one hour left
                || (request.oneHourExpiration && currentTime - thisOfferObj.endTime > 3600)
                // If removeBartering is true and this item is sold for something other than money
                || (request.removeBartering && !Item.checkIfTplIsMoney(thisOfferObj.requirements[0]._tpl))
                // If filtering by trader and the offer is from a player
                || (request.offerOwnerType == 1 && (thisOfferObj.user.memberType == 0 || thisOfferObj.user.memberType == 2))
                // If filtering by players and the offer is from a trader
                || (request.offerOwnerType == 2 && thisOfferObj.user.memberType == 4)
            ) {
                offers.splice(offerIndex, 1); // Remove this offer
            }
        }
        return offers;
    }

    static async getLinkedTo(searchId) {
        const items = Object.values(Item.getAll());
        const needed = [];
        const linked = await this.getLinkedSearch(searchId);
        // search through all items and push ID of items that are in the filter(s)
        for (let i = 0, length = items.length; i < length; i++) {
            const item = items[i];
            if (
                await this.isInFilters(item, "Slots", searchId) ||
                await this.isInFilters(item, "Chambers", searchId) ||
                await this.isInFilters(item, "Cartridges", searchId)
            )
                needed.push(item._id);
        }
        return [...needed, ...linked];
    }

    static async getLinkedSearch(searchId) {
        const item = Item.get(searchId);
        const linked = new Set([
            ...await this.getFilters(item, "Slots"),
            ...await this.getFilters(item, "Chambers"),
            ...await this.getFilters(item, "Cartridges")
        ]);
        return Array.from(linked);
    }

    static async getCylinder() {

    }

    static async getCategoriesForOffers(offers) {
        const categories = [];
        for (let i = offers.length - 1; i > -1; i--) {
            const item = offers[i].items[0];
            if (!categories.includes(item._tpl)) {
                categories.push(item._tpl);
            }
        }
        return categories;
    }

    static async getNeededFor(searchId, offers) {
        return offers.filter(function (ragfairOffer) {
            return ragfairOffer.requirements[0]._tpl === searchId;
        });
    }

    /**
     * I can't think of a clever way to reduce this footprint - King
     * @param {*} item
     * @param {*} slot
     * @param {*} id
     * @returns
     */
    static async getFilters(item, slot, id = null) {
        const result = new Set();
        if (!item._props[slot])
            return result;

        for (const sub of item._props[slot]) {
            if (!("_props" in sub && "filters" in sub._props))
                continue;

            for (const filter of sub._props.filters) {
                for (const filterID of filter.Filter)
                    result.add(filterID);
            }
        }
        return result;
    }

    static async isInFilters(item, slot, id) {
        if (!item._props[slot])
            return false;

        for (const sub of item._props[slot]) {
            if (!("_props" in sub && "filters" in sub._props))
                continue;

            for (const filter of sub._props.filters) {
                if (!filter.Filter[id])
                    continue;
                return true;
            }
        }
    }

    /**
     * Iterate through TplLookup category database and return item ID
     * if the item is found in the database under correct category
     * @param {*} handbookId
     * @returns
     */
    static async getTplFromHandbook(handbookId) {
        let result = [];
        const bastards = [
            "5b5f71b386f774093f2ecf11", // functional mods (not sure why this isn't blanketed)
            "5b5f71a686f77447ed5636ab" //mods grandparent

        ];
        const children = await childrenCategories(handbookId);

        if (bastards.includes(handbookId)) {
            for (let c = 0, cLength = children.length; c < cLength; c++) {
                const child = children[c];
                const grandchildren = await childrenCategories(child);
                for (let gc = 0, gcLength = grandchildren.length; gc < gcLength; gc++) {
                    const grandchild = grandchildren[gc];
                    const templates = await templatesWithParent(grandchild);
                    result = result.concat(templates);
                }
            }
            return result;
        }

        if (!await isCategory(handbookId)) { // its a specific item searched then
            return handbookId;
        }

        // list all item of the category
        result = result.concat(await templatesWithParent(handbookId));
        for (let c = 0, cLength = children.length; c < cLength; c++) {
            const child = children[c];
            const templates = await templatesWithParent(child);
            result = result.concat(templates);
        }
        return result;
    }

    static async sortOffers(request, offers) {
        // Sort results
        switch (request.body.sortType) {
            case 0: // ID
                offers.sort((a, b) => {
                    return a.intId - b.intId;
                });
                break;

            case 3: // Merchant (rating)
                offers.sort((a, b) => {
                    return a.user.rating - b.user.rating;
                });
                break;

            case 4: // Offer (title)
                const { lang } = await Account.get(await Response.getSessionID(request));
                const { locale } = await Locale.get(lang);

                offers.sort((a, b) => {
                    const ia = a.items[0]._tpl;
                    const ib = b.items[0]._tpl;


                    const aa = locale[`${ia} Name`] || ia;
                    const bb = locale[`${ib} Name`] || ib;

                    return (aa < bb) ? -1 : (aa > bb) ? 1 : 0;
                });
                break;

            case 5: // Price
                offers.sort((a, b) => {
                    return a.requirementsCost - b.requirementsCost;
                });
                break;

            case 6: // Expires in
                offers.sort((a, b) => {
                    return a.endTime - b.endTime;
                });
                break;
        }

        // 0=ASC 1=DESC
        if (request.body.sortDirection === 1) {
            offers.reverse();
        }

        return offers;
    }

    static async generatePlayersOffers() {
        // Generate offers for players
        const items = await Item.getAllWithoutKeys();

        for (let i = 0, length = items.length; i < length; i++) {
            const item = items[i];
            if (await item.isBlacklisted() || await Preset.itemHasPreset(item._id))
                continue;
            const offerItems = [];

            const offerItemId = generateMongoID();
            offerItems.push({
                _id: offerItemId,
                _tpl: item._id
            });
            const itemPrice = Item.getItemPrice(item._id);
            const offerTimestamp = getCurrentTimestamp();

            const offerId = generateMongoID();
            const offer = {
                _id: offerId,
                user: {
                    id: "99",
                    memberType: 0,
                    nickname: "MisterNutSac",
                    rating: 100,
                    isRatingGrowing: true,
                    avatar: "/files/trader/avatar/unknown.jpg"
                }
            };

            offer.root = offerItems[0]._id;
            offer.items = offerItems;
            offer.itemsCost = itemPrice;
            offer.requirementsCost = itemPrice;
            offer.sellInOnePiece = false;
            offer.requirements = [{
                count: itemPrice,
                _tpl: "5449016a4bdc2d6f028b456f"
            }];
            offer.startTime = offerTimestamp - 3600;
            offer.endTime = offerTimestamp + 3600;
            offer.priority = false;
            offer.loyaltyLevel = 1;
            database.flea.offers.push(offer);
        }
        database.flea.offersCount = database.flea.offers.length;
    }
}

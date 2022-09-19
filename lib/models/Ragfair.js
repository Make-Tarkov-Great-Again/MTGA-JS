const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Trader } = require("./Trader");
const { RagfairOffer } = require("./RagfairOffer");
const { Preset } = require("./Preset");
const cloneDeep = require("rfdc")();

const {
    getCurrentTimestamp, generateMongoID,
    logger, writeFile, stringify, templatesWithParent,
    childrenCategories, isCategory
} = require("../../utilities");


class Ragfair extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    /**
     * Return a empty Ragfair dataset object
     */
    static async initialize() {
        return {
            offers: [],
            offersCount: 0,
            selectedCategory: "",
            categories: {}
        };
    }

    /**
     * Update the number of offers in the ragfair
     * @param {*} count
     */
    async setOffersCount(count) {
        this.offersCount = count;
    }

    /**
     * Update the categories object which represent the amount of offers per category
     * @param {*} categories
     */
    async setCategories(categories) {
        this.categories = categories;
    }


    /**
     * Remove offer with index from the offers array
     * @param {*} index
     */
    async removeOfferWithIndex(index) {
        this.offers.splice(index, 1);
        await this.setOffersCount(this.offers.length);
    }

    /**
     * Load all ragfair offers:
     * - remove expired,
     * - load traders offers,
     * - load player offers (TODO)
     * - refresh categories info
     */
    async loadRagfairOffers() {
        if (this.offersCount) {
            await this.removeExpired();
        }
        await this.loadTradersOffers();
        await this.setOffersCount(this.offers.length);
        await this.setCategories(await Ragfair.generateAmountOffersPerCategories(this.offers));
    }

    /**
     * Count the amount of offers per category
     * @returns object categories
     */
    static async generateAmountOffersPerCategories(offers, filters = false) {
        const categories = {};
        if (filters) {
            for (const offer of offers) {
                const item = offer.items[0];
                if (filters.includes(item._tpl)) {
                    if (categories[item._tpl]) {
                        categories[item._tpl]++;
                    } else {
                        categories[item._tpl] = 1;
                    }
                }
            }
        } else {
            for (const offer of offers) {
                const item = offer.items[0];
                if (item._tpl in categories) {
                    categories[item._tpl]++;
                } else {
                    categories[item._tpl] = 1;
                }
            }
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
    async generateOffersBasedOnRequest(request) {
        await this.loadRagfairOffers();
        const output = { "offers": cloneDeep(this.offers) };
        output.offers = await Ragfair.reduceOffersBasedOnFilterRequest(output.offers, request);
        if (request.neededSearchId) {
            const foundOffers = await Ragfair.getNeededFor(request.neededSearchId, output.offers);
            output.categories = await Ragfair.generateAmountOffersPerCategories(output.offers, await Ragfair.getCategoriesForOffers(foundOffers));
            output.offers = await Ragfair.getOffersWithCategories(output.categories, output.offers);
            // when the user click a categorie, we want to show only the items related to the categorie
            if (request.handbookId) {
                const categoriesFilter = await Ragfair.getTplFromHandbook(request.handbookId);
                const filteredCategories = await Ragfair.generateAmountOffersPerCategories(output.offers, categoriesFilter);
                output.offers = await Ragfair.getOffersWithCategories(filteredCategories, output.offers);
            }
        } else if (request.linkedSearchId) {
            output.categories = await Ragfair.generateAmountOffersPerCategories(output.offers, await Ragfair.getLinkedTo(request.linkedSearchId));
            output.offers = await Ragfair.getOffersWithCategories(output.categories, output.offers);
            // when the user click a categorie, we want to show only the items related to the categorie
            if (request.handbookId) {
                const categoriesFilter = await Ragfair.getTplFromHandbook(request.handbookId);
                const filteredCategories = await Ragfair.generateAmountOffersPerCategories(output.offers, categoriesFilter);
                output.offers = await Ragfair.getOffersWithCategories(filteredCategories, output.offers);
            }
        } else if (Object.keys(request.buildItems).length > 0) {
            output.categories = await Ragfair.generateAmountOffersPerCategories(output.offers, Object.keys(request.buildItems));
            output.offers = await Ragfair.getOffersWithCategories(output.categories, output.offers);

        } else {
            const categoriesFilter = await Ragfair.getTplFromHandbook(request.handbookId); // we get the sub categories from handbook (handbook = weapon by default)
            const filteredCategories = await Ragfair.generateAmountOffersPerCategories(output.offers, categoriesFilter); // we get the amount of offers per sub category
            output.categories = await Ragfair.generateAmountOffersPerCategories(output.offers, Object.keys(this.categories)); // we want all categories to show
            output.offers = await Ragfair.getOffersWithCategories(filteredCategories, output.offers); // we get the offers with the current categories (handbook & subcategories)
        }
        output.offers = await Ragfair.sortOffers(request, output.offers);
        output.offersCount = output.offers.length;
        output.offers = output.offers.slice(request.page * request.limit, (request.page + 1) * request.limit);
        output.selectedCategory = request.handbookId;
        return output;
    }

    /**
     * Remove offers that expired, start from last offer
     */
    async removeExpired() {
        for (let i = this.offers.length - 1; i >= 0; i--) {
            const offer = this.offers[i];
            if (await offer.isExpired()) {
                await this.removeOfferWithIndex(i);
            }
        }
    }

    async loadTradersOffers() {
        const traders = await Trader.getAllWithoutKeys();
        for (const trader of traders) {
            if (!trader.isFence() && !trader.isRagfair()) {
                await trader.refreshTrader();
                if (trader.nextResupply < await getCurrentTimestamp() || !this.offersCount) {
                    this.offers = this.offers.concat(await trader.getRagfairOffers());
                    Object.assign(this.categories, trader.assort.loyal_level_items);
                }
            }
        }
    }


    static async reduceOffersBasedOnFilterRequest(offers, request) {
        const currentTime = await getCurrentTimestamp(); // Get current time, in seconds since epoch
        const currencies = {
            1: "5449016a4bdc2d6f028b456f", // RUB
            2: "5696686a4bdc2da3298b456a", // USD
            3: "569668774bdc2da2298b4568"  // EUR
        };

        for (let offerIndex = offers.length - 1; offerIndex >= 0; offerIndex--) {
            const thisOfferObj = offers[offerIndex];

            // Exclude offers if they meet any of these conditions
            if ((request.currency != 0
                && currencies[request.currency] != thisOfferObj.requirements[0]._tpl)  // If the request specifies a currency which doesn't match the currency for this offer
                || (request.priceFrom > 0
                    && thisOfferObj.requirements[0].count < request.priceFrom) // If this item's price is less than the requested priceFrom
                || (request.priceTo > 0
                    && thisOfferObj.requirements[0].count > request.priceTo) // If this item's price is greater than the requested priceTo
                || (request.quantityFrom > 0
                    && typeof thisOfferObj.items[0].upd?.StackObjectsCount != 'undefined'
                    && thisOfferObj.items[0].upd.StackObjectsCount < request.quantityFrom) // If this item's quantity is less than the requested quantityFrom
                || (request.quantityTo > 0
                    && typeof thisOfferObj.items[0].upd?.StackObjectsCount != 'undefined'
                    && thisOfferObj.items[0].upd.StackObjectsCount > request.quantityTo) // If this item's quantity is greater than the requested quantityFrom
                || (request.conditionFrom > 0
                    && typeof thisOfferObj.items[0].upd?.Repairable?.Durability != 'undefined'
                    && thisOfferObj.items[0].upd.Repairable.Durability < request.conditionFrom) // If this item's condition is less than the requested conditionFrom
                || (request.conditionTo < 100
                    && typeof thisOfferObj.items[0].upd?.Repairable?.Durability != 'undefined'
                    && thisOfferObj.items[0].upd.Repairable.Durability > request.conditionTo) // If this item's condition is greater than the requested conditionTo
                || (request.oneHourExpiration
                    && currentTime - thisOfferObj.endTime > 3600) // If oneHourExpiration is true and the offer has more than one hour left
                || (request.removeBartering
                    && !await Item.checkIfTplIsMoney(thisOfferObj.requirements[0]._tpl)) // If removeBartering is true and this item is sold for something other than money
                || (request.offerOwnerType == 1
                    && (thisOfferObj.user.memberType == 0
                        || thisOfferObj.user.memberType == 2)) // If filtering by trader and the offer is from a player
                || (request.offerOwnerType == 2
                    && thisOfferObj.user.memberType == 4) // If filtering by players and the offer is from a trader
            ) {
                offers.splice(offerIndex, 1); // Remove this offer
            } else continue;
        }

        return offers;
    }

    static async getLinkedTo(searchId) {
        const itemsModels = await Item.getAllWithoutKeys();
        const items = [];
        for (const item of itemsModels) {
            if (!await item.isBlacklisted()) {
                items.push(item);
            }
        }
        const needed = [];
        const linked = await this.getLinkedSearch(searchId);
        //const item = await Item.get(searchId);
        // search through all items and push ID of items that are in the filter(s)
        for (const i of items) {
            if (
                await this.checkFilters(i, "Slots", searchId) ||
                await this.checkFilters(i, "Chambers", searchId) ||
                await this.checkFilters(i, "Cartridges", searchId) ||
                await this.checkFilters(i, "Cartridges", searchId)
            )
                needed.push(i._id);
        }
        return [...needed, ...linked];
    }

    static async getLinkedSearch(searchId) {
        const item = await Item.get(searchId);
        const linked = new Set([
            ...await this.checkFilters(item, "Slots"),
            ...await this.checkFilters(item, "Chambers"),
            ...await this.checkFilters(item, "Cartridges")
        ]);
        return Array.from(linked);
    }

    static async getCategoriesForOffers(offers) {
        const categories = [];
        for (const offer of offers) {
            const item = offer.items[0];
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
    static async checkFilters(item, slot, id = null) {
        if (id) {
            if (slot in item._props && item._props[slot].length) {
                for (let sub of item._props[slot]) {
                    if ("_props" in sub && "filters" in sub._props) {
                        for (let filter of sub._props.filters) {
                            if (filter.Filter.includes(id)) {
                                return true;
                            }
                        }
                    }
                }
            }
            return false;
        } else {
            let result = new Set();
            if (slot in item._props && item._props[slot].length) {
                for (let sub of item._props[slot]) {
                    if ("_props" in sub && "filters" in sub._props) {
                        for (let filter of sub._props.filters) {
                            for (let f of filter.Filter) {
                                result.add(f);
                            }
                        }
                    }
                }
            }

            return result;
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
        if (bastards.includes(handbookId)) {
            for (const categ2 of await childrenCategories(handbookId)) {
                for (const categ3 of await childrenCategories(categ2)) {
                    result = result.concat(await templatesWithParent(categ3));
                }
            }
        } else {
            if (await isCategory(handbookId)) {
                // list all item of the category
                result = result.concat(await templatesWithParent(handbookId));

                for (const categ of await childrenCategories(handbookId)) {
                    result = result.concat(await templatesWithParent(categ));
                }
            } else {
                // its a specific item searched then
                result.push(handbookId);
            }
        }
        return result;
    }

    static async sortOffers(request, offers) {
        // Sort results
        switch (request.sortType) {
            case 0: // ID
                offers.sort((a, b) => {
                    return a.intId - b.intId;
                });
                break;

            case 3: // Merchant (rating)
                offers.sort((a, b) => {
                    return b.user.rating - a.user.rating;
                });
                break;

            case 4: // Offer (title)
                const { database: { items } } = require("../../app");
                offers.sort((a, b) => {
                    try {
                        let aa = items[a._id][1]._name;
                        let bb = items[b._id][1]._name;

                        aa = aa.substring(aa.indexOf("_") + 1);
                        bb = bb.substring(bb.indexOf("_") + 1);

                        return aa.localeCompare(bb);
                    } catch (e) {
                        return 0;
                    }
                });
                break;

            case 5: // Price
                offers.sort((a, b) => {
                    return a.requirements[0].count - b.requirements[0].count;
                });
                break;

            case 6: // Expires in
                offers.sort((a, b) => {
                    return a.endTime - b.endTime;
                });
                break;
        }

        // 0=ASC 1=DESC
        if (request.sortDirection === 1) {
            offers.reverse();
        }

        return offers;
    }

    async generatePlayersOffers() {
        // Generate offers for players
        const items = await Item.getAllWithoutKeys();
        for (const item of items) {
            if (await item.isBlacklisted() || await Preset.itemHasPreset(item._id))
                continue;
            const offerItems = [];
            offerItems.push({
                _id: await generateMongoID(),
                _tpl: item._id
            });
            const itemPrice = await Item.getItemPrice(item._id);
            const offerTimestamp = await getCurrentTimestamp();
            const offer = {
                _id: await generateMongoID(),
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
            this.offers.push(offer);
        }
        this.offersCount = this.offers.length;
    }


    /** BUNCH OF FUNCTION THAT AREN'T USED BUT COULD BE USEFULL AS REFERENCES*/
    /**
    async addExampleItem() {
        const trader = await this.getTraderTemplate("Prapor");
        const USD = await this.getCustomCurrencyTemplate("RUB", 5);
        await this.addItemByTemplateId(
            trader,
            "5e340dcdcb6d5863cc5e5efb",
            USD,
            150,
            undefined,
            false,
            1); // add a vog to offers
    }
    */
    /**
    async addItemByTemplateId(user, templateId, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        const tempItem = {
            _id: await generateMongoID(),
            _tpl: templateId
        };
        return this.addItem(user, tempItem, requirements, amount, childItems, sellInOnePiece, loyaltyLevel);
    }
    */
    /**
    async addItem(user, parentItem, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        const offer = {}

        offer._id = await generateMongoID();
        offer.intId = this.nextOfferId;
        offer.user = {
            id: user.id,
            memberType: user.memberType
        };
        offer.root = parentItem._id;
        offer.items = [
            {
                _id: parentItem._id,
                _tpl: parentItem._tpl,
                upd: {
                    StackobjectsCount: amount
                }
            }
        ];

        if (childItems) {
            Object.assign(offer.items, childItems);
        }

        const currentTime = Date.now();

        offer.itemsCost = 100; // calculate
        offer.requirements = requirements;
        offer.summaryCost = 110; // calculate
        offer.sellInOnePiece = sellInOnePiece;
        offer.startTime = currentTime - 3600;
        offer.endTime = currentTime + 3600;

        // priority? //
        // buy restriction //

        if (loyaltyLevel) {
            offer.loyaltyLevel = loyaltyLevel;
        }

        this.offers.push(offer);
        this.nextOfferId += 1;
    }
    */
    /**
    async getCustomCurrencyTemplate(currency, amount) {
        let templateId;

        switch (currency) {
            case "RUB":
                templateId = "5449016a4bdc2d6f028b456f";
                break;

            case "USD":
                templateId = "5696686a4bdc2da3298b456a";
                break;

            case "EUR":
                templateId = "569668774bdc2da2298b4568";
                break;
        }

        return [
            {
                count: amount,
                _tpl: templateId
            }
        ];
    }
     */
    /**
    async cleanseItem(item) {

        let soiledItem = item;
        if (item[0]) soiledItem = item[0];
        if (soiledItem.hasOwnProperty("parentId")) delete soiledItem.parentId;
        if (soiledItem.hasOwnProperty("slotId")) delete soiledItem.slotId;
        if (soiledItem.upd.hasOwnProperty("UnlimitedCount")) delete soiledItem.upd.UnlimitedCount
        if (soiledItem.upd.hasOwnProperty("BuyRestrictionCurrent")) delete soiledItem.upd.BuyRestrictionCurrent;
        if (soiledItem.upd.hasOwnProperty("BuyRestrictionMax")) delete soiledItem.upd.BuyRestrictionMax;

        return item
    }
     */
}

module.exports.Ragfair = Ragfair;

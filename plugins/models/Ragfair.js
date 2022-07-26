const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Trader } = require("./Trader");
const { Preset } = require("./Preset");
const cloneDeep = require("rfdc")();

const {
    FastifyResponse, getCurrentTimestamp, generateItemId,
    logger, findChildren, writeFile, readParsed,
    getAbsolutePathFrom, stringify, fileExist,
    templatesWithParent, childrenCategories, isCategory,
    getFileUpdatedDate } = require("../utilities");

class Ragfair extends BaseModel {
    constructor() {
        super();

        this.categories = {};
        this.offers = [];
        this.offersCount = 0;
        this.selectedCategory = "";
        this.nextOfferId = 1;
    }


    async initialize() {
        let data = {
            offers: [],
            offersCount: 0,
            selectedCategory: "5b5f78dc86f77409407a7f8e",
            categories: {}
        }

        data.offers = await this.formatTraderAssorts();

        data.offersCount = data.offers.length;

        const categories = await this.getAllCategories();
        data.categories = await Ragfair.formatCategories(categories, data.offers);
        return data;
    }

    /**
     * @param {*} request 
     * @returns 
     */
    static async generateOffersBasedOnRequest(request) {
        const { database } = require("../../app");
        let ragfair = cloneDeep(database.ragfair);


        // only way to refresh page after removing a filter (maybe)
        /*
        if (request.updateOfferCount === true) {
            const list = await this.investigateHandbookId(request.handbookId);
            ragfair.categories = await this.formatCategories(
                ragfair.categories,
                ragfair.offers,
                list
            );
            ragfair.offers = await this.reduceOffersBasedOnCategories(
                ragfair.offers,
                ragfair.categories
            );
        }
        */

        /**
         * Probably need to start saving the last request so it can be 
         * compared.... fuck if i know
         */
        if (database.core.serverConfig.directoryTimers.FleaMarket === 1) {
            ragfair = await this.applyRequestReturnRagfair(request, ragfair);

        } else if (database.core.serverConfig.directoryTimers.FleaMarket === 0) {

            if (database.core.serverConfig.directoryTimers.FleaMarket === 0) {
                database.core.serverConfig.directoryTimers.FleaMarket = 1;
            }

            const list = await this.investigateHandbookId(request.handbookId);
            const tempCateories = await this.formatCategories(
                ragfair.categories,
                ragfair.offers,
                list
            );

            ragfair.offers = await this.reduceOffersBasedOnCategories(
                ragfair.offers,
                tempCateories
            );

            ragfair.offersCount = ragfair.offers.length;
        }
        return ragfair;
    }

    static async applyRequestReturnRagfair(request, ragfair) {
        if (request.handbookId != "") {
            const list = await this.investigateHandbookId(request.handbookId);
            ragfair.categories = await this.formatCategories(
                ragfair.categories,
                ragfair.offers,
                list
            );
            if (request.neededSearchId != "") {
                ragfair.categories = await this.formatCategories(
                    ragfair.categories,
                    ragfair.offers,
                    await this.getNeededSearch(request.neededSearchId)
                );
                ragfair.offers = await this.reduceOffersBasedOnCategories(
                    ragfair.offers,
                    ragfair.categories
                );
            } else if (request.linkedSearchId != "") {
                ragfair.categories = await this.formatCategories(
                    ragfair.categories,
                    ragfair.offers,
                    await this.getLinkedSearch(request.linkedSearchId)
                );
                ragfair.offers = await this.reduceOffersBasedOnCategories(
                    ragfair.offers,
                    ragfair.categories
                );
            } else {
                ragfair.offers = await this.reduceOffersBasedOnCategories(
                    ragfair.offers,
                    ragfair.categories
                );
            }
        } else if (request.linkedSearchId != "") {
            ragfair.categories = await this.formatCategories(
                ragfair.categories,
                ragfair.offers,
                await this.getLinkedSearch(request.linkedSearchId)
            );

            ragfair.offers = await this.reduceOffersBasedOnCategories(
                ragfair.offers,
                ragfair.categories
            );
        } else if (request.neededSearchId != "") {
            ragfair.categories = await this.formatCategories(
                ragfair.categories,
                ragfair.offers,
                await this.getNeededSearch(request.neededSearchId)
            );

            ragfair.offers = await this.reduceOffersBasedOnCategories(
                ragfair.offers,
                ragfair.categories
            );
        }

        ragfair.offers = await this.reduceOffersBasedOnFilterRequest(
            ragfair.offers,
            request
        );

        ragfair.offers = await this.sortOffers(
            request,
            ragfair.offers.slice(
                request.page * request.limit,
                (request.page + 1) * request.limit
            ));

        ragfair.offersCount = ragfair.offers.length;
        return ragfair;
    }


    /** This can probably be combined with reduceOffersBasedOnFilterRequest
     * Remove offers that are not in the categories, return filtered offers (if array)
     * @param {*} offers filter the offers based on the categories
     * @param {*} categories the categories to filter the offers
     * @returns 
     */
    static async reduceOffersBasedOnCategories(offers, categories) {
        return offers.filter(function (ragfairOffer) {
            return ragfairOffer.items[0]._tpl in categories;
        });
    }

    static async reduceOffersBasedOnFilterRequest(offers, request) {
        const currentTime = getCurrentTimestamp(); // Get current time, in seconds since epoch
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
                    && !this.checkIfMoney(thisOfferObj.requirements[0]._tpl)) // If removeBartering is true and this item is sold for something other than money
                || (request.offerOwnerType == 1
                    && (thisOfferObj.user.memberType == 0
                        || thisOfferObj.user.memberType == 2)) // If filtering by trader and the offer is from a player
                || (request.offerOwnerType == 2
                    && thisOfferObj.user.memberType == 4) // If filtering by players and the offer is from a trader
            ) {
                offers.splice(offerIndex, 1); // Remove this offer
                continue;
            } else continue;
        }

        return offers;
    }

    static checkIfMoney(input) {
        return [
            "5449016a4bdc2d6f028b456f", // RUB
            "5696686a4bdc2da3298b456a", // USD
            "569668774bdc2da2298b4568"  // EUR
        ].includes(input); // Return true if the input ID matches anything in this array, false if it doesn't
    }

    static async getNeededSearch(searchId) {
        const { database } = require("../../app");
        const items = await this.bannedItemFilter(database.items);
        let needed = [];
        // search through all items and push ID of items that are in the filter(s)
        for (const item of items) {
            if (
                await this.checkFilters(item, "Slots", searchId) ||
                await this.checkFilters(item, "Chambers", searchId) ||
                await this.checkFilters(item, "Cartridges", searchId)
            )
                needed.push(item._id);
        }
        return needed;
    }

    static async getLinkedSearch(searchId) {
        const item = await Item.get(searchId);
        const linked = new Set(
            [
                ...await this.checkFilters(item, "Slots"),
                ...await this.checkFilters(item, "Chambers"),
                ...await this.checkFilters(item, "Cartridges"),
            ]
        )
        return Array.from(linked);
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
 * 
 * @param {*} handbookId 
 * @returns 
 */
    static async investigateHandbookId(handbookId) {
        let result = [];
        if (handbookId === "5b5f71a686f77447ed5636ab") {
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


    async formatItems() {
        //will be used when we start creating offers from the Item database

        const items = await Item.getAll();
        const filteredItems = await Ragfair.bannedItemFilter(items);
        let childlessList = [];

        for (const i in filteredItems) {
            const item = filteredItems[i];
            if (await Preset.itemHasPreset(item._id)) {
                const preset = await Preset.getPresetsForItem(item._id)
                for (const p in preset) {
                    const family = preset[p]._items
                    //console.log(family)
                }
            } else {
                childlessList.push(item._id);
            }
        }
    }

    static async bannedItemFilter(items) {
        let filteredItems = [];
        let bannedItems = [];
        if (fileExist("./bannedItems.json")) {
            bannedItems = readParsed(getAbsolutePathFrom(`/bannedItems.json`));
        }
        let counter = 0;

        for (const item in items) {
            if (!bannedItems.includes(items[item]._id)) {
                switch (true) {
                    case items[item]._type === "Node":
                    case items[item]._props.IsUnbuyable === true:
                    case items[item]._props.QuestItem === true:
                    case items[item]._props.CanSellOnRagfair === false:
                        counter += 1;
                        bannedItems.push(items[item]._id);
                        continue;
                }
            }
            if (items[item]._props.CanSellOnRagfair === true) {
                filteredItems.push(items[item]);
            }
        }
        if (counter != 0) {
            logger.logError(`Banned items updated by ${counter}`);
            writeFile("./bannedItems.json", stringify(bannedItems), true);
        }
        return filteredItems;
    }

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

    async getAllCategories() {
        const traders = await Trader.getAll();
        let categories = {};
        for (const t in traders) {
            if (traders[t].isRagfair() || traders[t].isFence()) continue;
            Object.assign(categories, traders[t].assort.loyal_level_items);
        }
        return categories;
    }

    /**
     * Ragfair categories are based on the amount of unique offerId's and the amount of individual items in offer array
     * @param {*} categories pass categories from database
     * @param {*} offers pass offers from database
     * @param {*} filters pass selected filter to add to categories
     * @returns 
     */
    static async formatCategories(categories, offers, filters = null) {

        if (filters) {
            let filteredCategories = {};
            for (let filter of filters) {
                filteredCategories[filter] = 1;
            }
            return filteredCategories;
        } else {
            let countedCategories = {};

            for (let offer of offers) {
                let item = offer.items[0];

                countedCategories[item._tpl] = countedCategories[item._tpl] || 0;
                countedCategories[item._tpl]++;
            }

            for (let c in categories) {
                if (!countedCategories[c]) {
                    countedCategories[c] = 1;
                }
            }

            return countedCategories;
        }
    }

    async formatTraderAssorts() {
        const traders = await Trader.getAll();
        let offers = []

        for (const t in traders) {
            if (traders[t].isRagfair() || traders[t].isFence()) continue;
            const trader = traders[t];
            const traderTemplate = await this.getTraderTemplate(trader.base.nickname);

            for (const item of trader.assort.items) {
                if (item.slotId === "hideout") {

                    const required = await this.convertItemDataForRagfairConversion(item, trader.assort);
                    const barter_scheme = required.barter;
                    const loyal_level = required.loyal;
                    const itemsToSell = required.items;

                    offers.push(await this.convertItemFromTraderToRagfairOffer(traderTemplate, itemsToSell, barter_scheme, loyal_level));
                }
            }
        }
        return offers;
    }


    async addAdditionalProperties(item) {
        const items = await Item.getAll();

        let updList = [];

        for (const id in items) {
            if (items[id]._id === item._id) {
                if (items[id]._props.Foldable) {
                    if (items[id]._props.Foldable === true) {
                        console.log("Foldable")
                    }
                }


            }
        }
    }


    async convertItemDataForRagfairConversion(item, assort) {
        let data = [];
        const childlessList = readParsed(getAbsolutePathFrom(`/childlessList.json`));

        //item = await this.addAdditionalProperties(item);

        if (childlessList.includes(item._id)) {
            data.items = item;
        } else {
            data.items = await findChildren(item._id, assort.items);
        }

        for (const barter in assort.barter_scheme) {
            if (item._id == barter) {
                data.barter = assort.barter_scheme[barter][0];
                break;
            }
        }

        for (const loyal in assort.loyal_level_items) {
            if (item._id == loyal) {
                data.loyal = assort.loyal_level_items[loyal];
                break;
            }
        }


        return data;
    }


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


    async convertItemFromTraderToRagfairOffer(traderTemplate, itemsToSell, barter_scheme, loyal_level) {

        let offer = {}

        offer._id = await generateItemId();

        offer.intId = this.nextOfferId;
        this.nextOfferId += 1

        offer.user = traderTemplate

        let item = cloneDeep(itemsToSell);

        offer.root = item[0]._id;

        offer.items = await this.cleanseItem(item);

        const cost = parseInt(barter_scheme[0].count);

        offer.itemsCost = cost; // calculate
        offer.requirements = barter_scheme;

        offer.requirementsCost = cost; //calculate
        offer.summaryCost = cost; // calculate
        offer.sellInOnePiece = false;

        const currentTime = getCurrentTimestamp();
        offer.startTime = currentTime - 3600;
        offer.endTime = currentTime + 3600;

        offer.locked = false; // i think these are quest locked items

        offer.unlimitedCount = false;
        if (itemsToSell.hasOwnProperty("upd") &&
            itemsToSell.upd.hasOwnProperty("UnlimitedCount")) {
            offer.unlimitedCount = itemsToSell.upd.UnlimitedCount;
        } else if (itemsToSell[0].hasOwnProperty("upd") &&
            itemsToSell[0].upd.hasOwnProperty("UnlimitedCount")) {
            offer.unlimitedCount = itemsToSell[0].upd.UnlimitedCount;
        }


        if (itemsToSell.hasOwnProperty("upd") &&
            itemsToSell.upd.hasOwnProperty("BuyRestrictionCurrent")) {
            offer.buyRestrictionMax = itemsToSell.upd.BuyRestrictionCurrent;
        } else if (itemsToSell[0].hasOwnProperty("upd") &&
            itemsToSell[0].upd.hasOwnProperty("BuyRestrictionCurrent")) {
            offer.buyRestrictionMax = itemsToSell[0].upd.BuyRestrictionCurrent;
        }

        offer.loyaltyLevel = loyal_level;

        return offer;
    }


    async getSlotIdFromParent(item) {
        const parent = item._parent;
        switch (true) {
            case parent === "55818a594bdc2db9688b456a":
                return "mod_stock";
            case parent === "5448bc234bdc2d3c308b4569":
                return "mod_magazine";
            case parent === "555ef6e44bdc2de9068b457e":
                return "mod_barrel";
            case parent === "550aa4bf4bdc2dd6348b456b":
                return "mod_muzzle";
            case parent === "622b327b267a1b13a44abea3":
                return "mod_gas_block";
            case parent === "55818a104bdc2db9688b4569":
                return "mod_handguard";
            case parent === "55818b224bdc2dde698b456f":
                return "mod_mount";
            case parent === "55818add4bdc2d5b648b456f":
            case parent === "55818ad54bdc2ddc698b4569":
                return "mod_scope";
            default:
                console.log("[RAGFAIR]: Unknown slotId: " + parent);
        }
    }


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
                _tpl: templateId,
            }
        ];
    }


    async getTraderTemplate(traderName) {
        let trader = await Trader.getTraderByName(traderName);
        if (trader) {
            return {
                id: trader.base._id,
                memberType: 4
            }
        }

        return false;
    }


    async addItemByTemplateId(user, templateId, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        let tempItem = {
            _id: await generateItemId(),
            _tpl: templateId
        }
        return this.addItem(user, tempItem, requirements, amount, childItems, sellInOnePiece, loyaltyLevel);
    }


    async addItem(user, parentItem, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        let offer = {}

        offer._id = await generateItemId();
        offer.intId = this.nextOfferId;
        offer.user = {
            id: user.id,
            memberType: user.memberType
        }
        offer.root = parentItem._id;
        offer.items = [
            {
                _id: parentItem._id,
                _tpl: parentItem._tpl,
                upd: {
                    StackobjectsCount: amount
                }
            }
        ]

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
            offer.loyaltyLevel = loyaltyLevel
        }

        this.offers.push(offer);
        this.nextOfferId += 1;
    }

    static async sortOffers(request, offers) {
        // Sort results
        switch (request.sortType) {
            case 0: // ID
                offers.sort((a, b) => { return a.intId - b.intId }
                );
                break;

            case 3: // Merchant (rating)
                offers.sort((a, b) => { return b.user.rating - a.user.rating }
                );
                break;

            case 4: // Offer (title)
                const { database } = require('../../app');
                offers.sort((a, b) => {
                    try {
                        let aa = database.items[a._id][1]._name;
                        let bb = database.items[b._id][1]._name;

                        aa = aa.substring(aa.indexOf("_") + 1);
                        bb = bb.substring(bb.indexOf("_") + 1);

                        return aa.localeCompare(bb);
                    } catch (e) {
                        return 0;
                    }
                });
                break;

            case 5: // Price
                offers.sort((a, b) => { return a.requirements[0].count - b.requirements[0].count; }
                );
                break;

            case 6: // Expires in
                offers.sort((a, b) => { return a.endTime - b.endTime; })
                break;
        }

        // 0=ASC 1=DESC
        if (request.sortDirection === 1) {
            offers.reverse();
        }

        return offers;
    }
}

module.exports.Ragfair = Ragfair;
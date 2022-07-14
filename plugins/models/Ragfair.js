const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Trader } = require("./Trader");
const { Preset } = require("./Preset");
const cloneDeep = require("rfdc")();

const {
    FastifyResponse, generateUniqueId, getCurrentTimestamp, generateItemId,
    logger, findChildren, writeFile, readParsed, getAbsolutePathFrom, stringify } = require("../utilities");

class Ragfair extends BaseModel {
    constructor() {
        super();

        this.categories = {};
        this.offers = [];
        this.offersCount = 0;
        this.selectedCategory = "";
        this.nextOfferId = 1;
        //await this.initialize();
    }

    async getRagfair() {
        return {
            categories: this.categories,
            offers: this.offers,
            offersCount: this.offersCount,
            selectedCategory: this.selectedCategory,
        }
    }

    async initialize() {
        //will be used when we start creating offers from the Item database
        /*         const items = await Item.getAll();
                const filteredItems = await this.bannedItemFilter(items); 
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
                } */


        let data = {
            offers: [],
            offersCount: 0,
            selectedCategory: "5b5f78dc86f77409407a7f8e",
            categories: {}
        }
        logger.logError("hahahahah");
        data.offers.push(...await this.formatTraderAssorts());
        logger.logSuccess("hahah i load ragfair after server loads");

        data.offersCount = data.offers.length;
        writeFile("./ragfair.json", stringify(FastifyResponse.applyBody(data), null, 2));

        return data;
    }

    async bannedItemFilter(items) {
        let filteredItems = [];
        const bannedItems = await Item.bannedItems();

        for (const item in items) {
            switch (true) {
                case items[item]._type === "Node":
                case items[item]._props.Name.includes(bannedItems):
                    continue;
                case items[item]._props.CanSellOnRagfair === true:
                    filteredItems.push(items[item]);
            }
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
        writeFile(`/ragfair.json`, stringify(offers), true);
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
        if (item[0]) {
            if (item[0].hasOwnProperty("parentId")) delete item[0].parentId;
            if (item[0].hasOwnProperty("slotId")) delete item[0].slotId;
            if (item[0].upd.hasOwnProperty("UnlimitedCount")) delete item[0].upd.UnlimitedCount
            if (item[0].upd.hasOwnProperty("BuyRestrictionCurrent")) delete item[0].upd.BuyRestrictionCurrent;
            if (item[0].upd.hasOwnProperty("BuyRestrictionMax")) delete item[0].upd.BuyRestrictionMax;
            return item
        } else {
            if (item.hasOwnProperty("parentId")) delete item.parentId;
            if (item.hasOwnProperty("slotId")) delete item.slotId;
            if (item.upd.hasOwnProperty("UnlimitedCount")) delete item.upd.UnlimitedCount
            if (item.upd.hasOwnProperty("BuyRestrictionCurrent")) delete item.upd.BuyRestrictionCurrent;
            if (item.upd.hasOwnProperty("BuyRestrictionMax")) delete item.upd.BuyRestrictionMax;
            return item
        }
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

        offer.itemsCost = barter_scheme[0].count; // calculate
        offer.requirements = barter_scheme;

        offer.requirementsCost = barter_scheme[0].count //calculate
        offer.summaryCost = barter_scheme[0].count; // calculate
        offer.sellInOnePiece = false;

        const currentTime = Date.now();
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
        const parent = item._parent
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
        this.nextOfferId += 1
    }

    async sortOffers(request, offers) {
        // Sort results
        switch (request.body.sortType) {
            case 0: // ID
                offers.sort((a, b) => { return a.intId - b.intId }
                );
                break;

            case 3: // Merchant (rating)
                offers.sort((a, b) => { return b.user.rating - a.user.rating }
                );
                break;

            case 4: // Offer (title)
                offers.sort((a, b) => {
                    // @TODO: Get localized item names
                    // i just hijacked this from SIT/AE/JET/Balle
                    try {
                        let aa = helper_f.tryGetItem(a._id)[1]._name;
                        let bb = helper_f.tryGetItem(b._id)[1]._name;

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
                offers.sort((a, b) => { return a.endTime - b.endTime;; })
                break;
        }

        // 0=ASC 1=DESC
        if (request.sortDirection === 1) {
            offers.reverse();
        }

        return offers;
    }

    static async getSelectedCategory(request) {
        const body = request.body;
        switch (true) {
            case body.handbookId != "":
                return request.body.handbookId;
            case body.linkedSearchId != "":
                return request.body.linkedSearchId;
            case body.neededSearchId != "":
                return request.body.neededSearchId;
        }
    }

    static async getLimit(request) {
        const body = request.body;
        return body.limit;
    }
}

module.exports.Ragfair = Ragfair;
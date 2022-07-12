const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { Trader } = require("./Trader");
const { Preset } = require("./Preset");

const {
    FastifyResponse, generateUniqueId, getCurrentTimestamp,
    logger, findChildren, writeFile, readParsed, getAbsolutePathFrom } = require("../utilities");

class Ragfair extends BaseModel {
    constructor() {
        super();
        this.offers = [];
        this.nextOfferId = 1;
        //await this.initialize();
    }

    async initialize() {
        const items = await Item.getAll();
        const filteredItems = await this.bannedItemFilter(items);
        const assorts = await this.getRequiredTraderInformationToMakeFuckingOffer();

        //check filtered items for Presets and return them
        for (const i in filteredItems) {
            const item = filteredItems[i];
            if (await Preset.itemHasPreset(item._id)) {
                const preset = await Preset.getPresetsForItem(item._id)
                for (const p in preset) {
                    const family = preset[p]._items
                    //console.log(family)
                }
            }
        }


        await this.addExampleItem();
        //return filteredItems;
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

    async getRequiredTraderInformationToMakeFuckingOffer() {
        const traders = await Trader.getAll();
        let data = {
            "categories": {},
            "offers": [], "offersCount": 100,
            "selectedCategory": "5b5f78dc86f77409407a7f8e"
        }

        for (const t in traders) {
            const trader = traders[t];
            const traderTemplate = await this.getTraderTemplate(trader.base.nickname);
            const childlessList = readParsed(getAbsolutePathFrom(`/childlessList.json`));

            for (const item of trader.assort.items) {
                if (item.slotId === "hideout") {

                    let barter_scheme;
                    let loyal_level;
                    let itemsToSell = [];

                    if (childlessList.includes(item._id)) {
                        itemsToSell.push(item);
                    } else {
                        let children = await findChildren(item._id, trader.assort.items)
                        let parent = children.shift() //incase i need to use it later
                        itemsToSell.push(parent, ...children);
                    }

                    for (const barter in trader.assort.barter_scheme) {
                        if (item._id == barter) {
                            barter_scheme = trader.assort.barter_scheme[barter][0];
                            break;
                        }
                    }

                    for (const loyal in trader.assort.loyal_level_items) {
                        if (item._id == loyal) {
                            loyal_level = trader.assort.loyal_level_items[loyal];
                            break;
                        }
                    }

                    this.createTraderOffer(traderTemplate, itemsToSell, barter_scheme, loyal_level);
                }
            }
        }
        return assorts;
    }

    async createTraderOffer(traderTemplate, itemsToSell, barter_scheme, loyal_level) {

        let offer = {}
        let newId = await generateUniqueId();

        offer._id = newId;
        offer.intId = this.nextOfferId;
        offer.user = traderTemplate
        offer.root = itemsToSell[0]._id;
        offer.items = itemsToSell;
        offer.requirements = barter_scheme;
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
            _id: await generateUniqueId(),
            _tpl: templateId
        }
        return this.addItem(user, tempItem, requirements, amount, childItems, sellInOnePiece, loyaltyLevel);
    }

    async addItem(user, parentItem, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        let offer = {}

        offer._id = await generateUniqueId();
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

    async getSelectedCategory(request) {
        const body = request.body;
        switch (body) {
            case body.handbookId:
                return body.handbookId;
            case body.linkedSearchId:
                return body.linkedSearchId;
            case body.neededSearchId:
                return body.neededSearchId;
        }
    }

    async getLimit(request) {
        const body = request.body;
        return body.limit;
    }
}

module.exports.Ragfair = Ragfair;
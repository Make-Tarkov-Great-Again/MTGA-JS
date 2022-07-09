const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { FastifyResponse, generateUniqueId, getCurrentTimestamp, logger } = require("../utilities");
const { database } = require("../../app");
const { Trader } = require("./Trader");

class Ragfair extends BaseModel {
    constructor() {
        super();
        this.offers = [];        
        this.nextOfferId = 1;
        //await this.initialize();
    }

    async addExampleItem() {
        const trader = await this.getTraderTemplate("Prapor");
        const USD = await this.getCurrencyTemplate("RUB", 5);
        await this.addItemByTemplateId(trader, "5e340dcdcb6d5863cc5e5efb", USD, 150, undefined, false, 1); // add a vog to offers

        
    }

    async initialize() {
        const items = await Item.getAll();

        let filteredItems = [];
        let counter = 0;

        /**
         * Banned Items list
         * (might need to be standalone)
         */
        const bannedItems =
            [
                "Pockets",
                "Shrapnel",
                "QuestRaidStash",
                "QuestOfflineStash",
                "stash 10x300",
                "Standard stash 10x28",
                "Prepare for escape stash 10x48",
                "Left Behind stash 10x38",
                "Edge of darkness stash 10x68",
                "Стандартный инвентарь" //default inventory
            ];

        for (const item in items) {
            switch (true) {
                case items[item]._type === "Node":
                case items[item]._props.Name.includes(bannedItems):
                    counter += 1;
                    continue;
                case items[item]._props.CanSellOnRagfair === true:
                    filteredItems.push(items[item]);
            }
        }
        logger.logSuccess(`[RAGFAIR]: ${filteredItems.length} items loaded; ${counter} items filtered.`);

        await this.addExampleItem();
        //return filteredItems;
    }

    async getCurrencyTemplate(currency, amount) {
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
        if(trader) {
            return {
                id: trader.base._id,
                memberType: 4
            }
        }

        return false;
    }

    async addItemByTemplateId(user, templateId, requirements, amount, childItems = undefined, sellInOnePiece = false, loyaltyLevel = undefined) {
        let tempItem = {
            _id : await generateUniqueId(),
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

        if(childItems) {
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

        if(loyaltyLevel) {
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

    async getOffers(request) {
        return await Ragfair.getAll();
        const sessionID = await FastifyResponse.getSessionID(request);

        if (request.offerOwnerType === 1) {
            return await this.getOffersFromTraders(request, sessionID);
        }
    }

    static async getOffersFromTraders(request, sessionID) {

    }


}

module.exports.Ragfair = Ragfair;
const { BaseModel } = require("./BaseModel");
const { Item } = require("./Item");
const { FastifyResponse } = require("../utilities");
const { database } = require("../../app");

class Ragfair extends BaseModel {
    constructor() {
        super();
    }

    static async initialize() {
        const items = Item.getAll();

        let filteredItems = [];
        let bannedItems = [ "Pockets"];

        for (let item of items) {
            if (item._type == "Node") {
                bannedItems.push(item._id);
                continue;
            }
            else (bannedItems.includes(item._name)) {
                if (bannedItems.includes(item._name)) {
                filteredItems.push(item);}
        }

    }

    static async convertItemsToRagfairAssort() {}

    static async createItemUpd() {

    }

    static async convertItemToRagfairAssort(item, StackObjectsCount) {
        let convertedItem = {
            _id: "",
            _tpl: "",
            parentId: "",
            slotId: "",
            upd: {
                StackObjectsCount: 99999999,
                UnlimitedCount: true
            }
        }

        let barter_scheme = [
            {
                count: 0,
                "_tpl": ""
            }
        ]

        let loyal_level_items[itemId] = 0;


    }


    static async sortOffers(request, offers) {
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
        switch (body) {
            case body.handbookId:
                return body.handbookId;
            case body.linkedSearchId:
                return body.linkedSearchId;
            case body.neededSearchId:
                return body.neededSearchId;
        }
    }

    static async getLimit(request) {
        const body = request.body;
        return body.limit;
    }

    static async getOffers(request) {
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
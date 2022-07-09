const { BaseModel } = require("./BaseModel");
const { findAndReturnChildrenByItems } = require("../utilities");

class Trader extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }

    isFence() {
        return this.base._id === "579dc571d53a0658a154fbec";
    }

    async getFilteredAssort(profile) {
        const output = {nextResupply: 0, items: [], barter_scheme: {}, loyal_level_items: {}};
        const loyalty = await profile.getLoyalty(this.base._id, this.base);

        const traderClone = await this.clone();

        if (this.isRagfair()) {
            output.items = traderClone.assort.items;
            output.barter_scheme = traderClone.assort.barter_scheme;
            output.loyal_level_items = traderClone.assort.loyal_level_items;
        } else {
            for (const item of traderClone.assort.items) {
                if (!traderClone.assort.loyal_level_items[item._id] || traderClone.assort.loyal_level_items[item._id] <= loyalty) {
                    output.items.push(item);
                    if (traderClone.assort.barter_scheme[item._id]) {
                        output.barter_scheme[item._id] = traderClone.assort.barter_scheme[item._id];
                    }
                    if (traderClone.assort.loyal_level_items[item._id]) {
                        output.loyal_level_items[item._id] = traderClone.assort.loyal_level_items[item._id];
                    }
                }
            }
        }
        return output;
    }


    async getAssortItemByID(itemId) {
        return this.assort.items.find(item => item._id == itemId);
    }

    /**
    async removeItemFromAssort(assort, itemID) {
        const idsList = await findAndReturnChildrenByItems(assort, itemID);
        delete assort[itemID];
        for (const i in idsList) {
            for (const a in assort) {
                if (assort.items[a]._id === idsList[i]) {
                    assort.items.splice(a, 1);
                }
            }
        }
        return assort;
    }
    */


    async getCurrency() {
        let currency;
        switch(this.base.currency) {
            case "EUR":
                currency = "569668774bdc2da2298b4568";
                break;
            case "USD":
                currency = "5696686a4bdc2da3298b456a";
                break;
            default:
                currency = "5449016a4bdc2d6f028b456f";
        }
        return currency;
    }

    async getPurchasesData(profile) {
        let currency;
        const output = [];
        switch(this.base.currency) {
            case "EUR":
                currency = "569668774bdc2da2298b4568";
                break;
            case "USD":
                currency = "5696686a4bdc2da3298b456a";
                break;
            default:
                currency = "5449016a4bdc2d6f028b456f";
        }

        for (const item of profile.character.Inventory.items) {
            // skip: idk what the first is, rubble, euro and dollars
            if (["544901bf4bdc2ddf018b456d", "5449016a4bdc2d6f028b456f", "569668774bdc2da2298b4568", "5696686a4bdc2da3298b456a"].includes(item._id)) {
                continue;
            }
            output[item._id] = [[{_tpl: currency, count: 1 }]];
        }
        return output;
    }

    static async getTraderByName(traderName) {
        let traders = await Trader.getAll()
        for (const [index, trader] of Object.entries(traders)) {
            if(trader.base.nickname === traderName) {
                return trader;
            }
        }
        return false;
    }
}

module.exports.Trader = Trader;

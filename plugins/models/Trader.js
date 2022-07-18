const { BaseModel } = require("./BaseModel");
const database = require("../../engine/database");
const { findAndReturnChildrenByItems, logger } = require("../utilities");
const { Item } = require("./Item");


class Trader extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async solve() {
        const { UtilityModel } = require("./UtilityModel");
        for (const [index, item] of Object.entries(this.assort.items)) {
            this.assort.items[index] = await UtilityModel.createModelFromParse("Item", item);
        }
    }

    async dissolve() {
        const dissolvedClone = await this.clone();
        for (const [index, item] of Object.entries(dissolvedClone.assort.items)) {
            dissolvedClone.assort.items[index] = Object.assign({}, item)
        }
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }

    isFence() {
        return this.base._id === "579dc571d53a0658a154fbec";
    }

    async getFilteredAssort(profile) {
        const output = {
            nextResupply: 0,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
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
        return this.assort.items.find(item => item._id === itemId);
    }

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

    async getBaseCurrency() {
        let currency;
        switch (this.base.currency) {
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
        const output = {};
        switch (this.base.currency) {
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
            // Skip money items, sorting table, default inventory, pockets, stashs
            if (!["5449016a4bdc2d6f028b456f", "569668774bdc2da2298b4568", "5696686a4bdc2da3298b456a",
            "602543c13fee350cd564d032", "55d7217a4bdc2d86028b456d", "627a4e6b255f7527fb05a0f6",
            "5811ce772459770e9e5f9532", "5963866b86f7747bfa1c4462", "5963866286f7747bf429b572"].includes(item._tpl)) {
                if (await this.itemInPurchaseCategories(item)) {
                    // Skip items that aren't part of a category buyable by trader (therapist don't buy bullets for example)
                    const price = database.templates.PriceTable[item._tpl];
                    if (price) {
                        output[item._id] = [[{ _tpl: currency, count: price }]];
                    }
                }
            }
        }
        return output;
    }

    async itemInPurchaseCategories(item) {
        for (const purchaseCategorie of this.base.sell_category) {
            const traderCategories = database.templates.Categories.filter(categorie => categorie.Id === purchaseCategorie );
            for (const traderCategorie of traderCategories) {
                if (!traderCategorie.ParentId) {
                    const subCategories = database.templates.Categories.filter(categorie => categorie.ParentId === traderCategorie.Id );
                    for (const subCategorie of subCategories) {
                        const itemData = database.templates.Items.filter(dbItem => dbItem.Id === item._tpl )[0];
                        if (itemData) {
                            if (subCategorie.Id === itemData.ParentId) {
                                return true;
                            }
                        }
                    }
                } else {
                    const itemData = database.templates.Items.filter(dbItem => dbItem.Id === item._tpl )[0];
                    if (itemData) {
                        if (traderCategorie.Id === itemData.ParentId) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    static async getTraderByName(traderName) {
        let traders = await Trader.getAll();
        for (const [index, trader] of Object.entries(traders)) {
            if (trader.base.nickname === traderName) {
                return trader;
            }
        }
        return false;
    }
}

module.exports.Trader = Trader;

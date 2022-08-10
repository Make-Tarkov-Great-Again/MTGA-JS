const { BaseModel } = require("./BaseModel");
const { RagfairOffers } = require("./RagfairOffers");
const { findAndReturnChildrenByItems, readParsed, getAbsolutePathFrom, findChildren, generateMongoID, getCurrentTimestamp } = require("../../utilities");


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
            dissolvedClone.assort.items[index] = Object.assign({}, item);
        }
    }

    isRagfair() {
        return this.base._id === "ragfair";
    }

    isFence() {
        return this.base._id === "579dc571d53a0658a154fbec";
    }

    async getSuitsOffers() {
        return this.suits;
    }

    async getFilteredAssort(profile) {
        const output = {
            nextResupply: 0,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };
        const loyalty = (await profile.getLoyalty(this.base._id, this.base) + 1);
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
        const { database } = require('../../app');
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

        const playerTraderStanding = await profile.getLoyalty(this.base._id, this.base);
        const buyCoef = this.base.loyaltyLevels[playerTraderStanding].buy_price_coef / 100;
        /**
         * BEWARE DEAR ADVENTURER, WHAT YOU ARE ABOUT TO SEE IS ONE HELL OF A SHITTY IMPLEMENTATION TO FILTER ITEMS
         * PLAYER CAN SELL TO TRADER.
         *
         * balls
         */
        for (const item of profile.character.Inventory.items) {
            // Skip money items, sorting table, default inventory, pockets & stashs
            if (!["5449016a4bdc2d6f028b456f", "569668774bdc2da2298b4568", "5696686a4bdc2da3298b456a",
                "602543c13fee350cd564d032", "55d7217a4bdc2d86028b456d", "627a4e6b255f7527fb05a0f6",
                "5811ce772459770e9e5f9532", "5963866b86f7747bfa1c4462", "5963866286f7747bf429b572"].includes(item._tpl)) {
                if (await this.itemInPurchaseCategories(item)) {
                    // Skip items that aren't part of a category buyable by trader (therapist don't buy bullets for example)
                    let price = database.templates.PriceTable[item._tpl];
                    let itemStackCount = 1;
                    if (item.upd && item.upd.StackObjectsCount)
                        itemStackCount = item.upd.StackObjectsCount;
                    price = price * itemStackCount;
                    price = price * buyCoef;
                    if (price) {
                        output[item._id] = [[{ _tpl: currency, count: price }]];
                    }
                }
            }
        }
        return output;
    }

    /**
     * Check if a given item is part of a category/subcategory accepted by the trader.
     * @param {Object} item
     * @returns true if it is, false otherwise
     */
    async itemInPurchaseCategories(item) {
        const { database } = require('../../app');
        for (const purchaseCategorie of this.base.sell_category) {
            const traderCategories = database.templates.Categories.filter(categorie => categorie.Id === purchaseCategorie);
            for (const traderCategorie of traderCategories) {
                /**
                 * If there is no ParentId for the parrent category, that mean it's a main category (weapons, meds, food...).
                 * we retrieve every subcategory (shotgun, rifle, snipers would be some of the subs for WEAPON)
                 */
                if (!traderCategorie.ParentId) {
                    const subCategories = database.templates.Categories.filter(categorie => categorie.ParentId === traderCategorie.Id);
                    for (const subCategorie of subCategories) {
                        // Retrieve the item from the templates database since it contains the parentId (category)
                        const itemData = database.templates.Items.filter(dbItem => dbItem.Id === item._tpl)[0];
                        if (itemData) {
                            if (subCategorie.Id === itemData.ParentId) {
                                return true;
                            }
                        }
                    }
                } else {
                    const itemData = database.templates.Items.filter(dbItem => dbItem.Id === item._tpl)[0];
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

    /**
     * Get the barter scheme for the item using it's id
     * @param {string} itemId 
     * @returns 
     */
    async getBarterSchemeById(itemId) {
        for (const barterID in this.assort.barter_scheme) {
            if (itemId === barterID) {
                return this.assort.barter_scheme[barterID][0];
            }
        }
        return "";
    }

    async getItemLoyalLevelById(itemID) {
        for (const loyalID in this.assort.loyal_level_items) {
            if (itemID === loyalID) {
                return this.assort.loyal_level_items[loyalID];
            }
        }
        return "";
    }

    /**
     * Convert trader assort offers to the ragfair offer format
     */
    async getRagfairOffers() {
        const convertedOffers = [];
        const childlessList = readParsed(getAbsolutePathFrom(`/childlessList.json`));
        let offerIntID = 1;
        for (const item of this.assort.items) {
            if (item.slotId === "hideout") {
                const user = {
                    id: this.base._id,
                    memberType: 4
                };
                const fullItem = {};
                if (childlessList.includes(item._id)) {
                    fullItem.item = item;
                } else {
                    fullItem.item = await findChildren(item._id, this.assort.items);
                }
                fullItem.barter = await this.getBarterSchemeById(item._id);
                fullItem.loyality = await this.getItemLoyalLevelById(item._id);
                const newOffer = new RagfairOffers();
                await newOffer.loadOffer(offerIntID, fullItem, user);
                convertedOffers.push(newOffer);
                offerIntID += 1;
            }
        }
        return convertedOffers;
    }

    static async getTraderByName(traderName) {
        const traders = await Trader.getAll();
        for (const [index, trader] of Object.entries(traders)) {
            if (trader.base.nickname === traderName) {
                return trader;
            }
        }
        return false;
    }
}

module.exports.Trader = Trader;

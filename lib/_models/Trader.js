const { BaseModel } = require("./BaseModel");
const { RagfairOffer } = require("./RagfairOffer");
//const { round, readParsed, generateMongoID, getCurrentTimestamp, logger, cloneDeep } = require("../utilities/index.mjs").default;
const { Item } = require("./Item");

//const { database: { core: { resupply, gameplay: { trading: { refreshTimeInMinutes } } } } } = require("../../app");



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

    async setAssort(newAssort) {
        this.assort = newAssort;
    }

    async refreshTrader() {
        this.generateAssort(getCurrentTimestamp());
    }

    async generateAssort(currentTime = null) {
        let assort;
        if (!this.assort) {
            assort = await readParsed(`./assets/database/traders/${this.base._id}/assort.json`);
            if (assort.data) {
                assort = assort.data;
            }
            //assort = await Trader.convertAssortMongoID(assort);
            this.baseAssort = await cloneDeep(assort);
            this.setAssort(assort);
            return;
        } else if (!this.assort?.nextResupply || this.assort.nextResupply <= currentTime) {
            assort = await cloneDeep(this.baseAssort);
            assort.nextResupply = currentTime + refreshTimeInMinutes * 60;
            await this.setAssort(assort);
            await this.solve();
            return;
        }
        return;
    }

    async generateFilteredAssort(profile) {
        this.refreshTrader();

        const output = {
            nextResupply: this.assort.nextResupply,
            items: [],
            barter_scheme: {},
            loyal_level_items: {}
        };

        const loyalty = await profile.getLoyalty(this.base._id) + 1;

        if (await this.isRagfair()) {
            output.items = this.assort.items;
            output.barter_scheme = this.assort.barter_scheme;
            output.loyal_level_items = this.assort.loyal_level_items;
        } else {
            for (const item of this.assort.items) {
                if (!this.assort.loyal_level_items[item._id] || this.assort.loyal_level_items[item._id] <= loyalty) {
                    output.items.push(item);
                    if (this.assort.barter_scheme[item._id]) {
                        output.barter_scheme[item._id] = this.assort.barter_scheme[item._id];
                    }
                    if (this.assort.loyal_level_items[item._id]) {
                        output.loyal_level_items[item._id] = this.assort.loyal_level_items[item._id];
                    }
                }
            }
        }
        return output;
    }

    async removeItemFromAssortAfterBuy(moveData) {
        const foundItem = this.assort.items.find(item => item._id === moveData.item_id);
        if (foundItem) {
            if (foundItem.upd.BuyRestrictionMax) {
                foundItem.upd.BuyRestrictionCurrent += moveData.count;
            }
            if (foundItem.upd.StackObjectsCount - moveData.count > 0) {
                foundItem.upd.StackObjectsCount -= moveData.count;
            } else {
                this.assort.items.splice(this.assort.items.indexOf(foundItem), 1);
            }
        } else {
            logger.error(`Could not find item to remove ${moveData.item_id} in assort`);
        }
    }

    async getAssortItemByID(itemId) {
        return this.assort.items.find(item => item._id === itemId);
    }

    async removeItemFromAssort(assort, itemID) {
        const idsList = await Item.findAndReturnChildrenAsIds(assort, itemID);
        assort.splice(itemID, 1);
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
                break;
        }
        return currency;
    }

    async getPurchasesData(profile) {
        const { database: { templates: { priceTable } } } = require("../../app.mjs");
        const currency = await this.getBaseCurrency();
        const output = {};

        const playerTraderStanding = await profile.getLoyalty(this.base._id);
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
                // Skip items that aren't part of a category buyable by trader (therapist doesn't buy bullets for example)
                if (await this.itemInPurchaseCategories(item)) {
                    let price = priceTable[item._tpl];
                    let itemStackCount = 1;

                    if (item.upd && item.upd.StackObjectsCount)
                        itemStackCount = item.upd.StackObjectsCount;

                    price = price - price * buyCoef * itemStackCount;
                    if (item.upd) {
                        if (item.upd.Repairable) {
                            price *= item.upd.Repairable.Durability / item.upd.Repairable.MaxDurability;
                        }
                        if (item.upd.MedKit && item.upd.MedKit.HpResource) {
                            const medItem = await Item.get(item._tpl);
                            price *= item.upd.MedKit.HpResource / medItem._props.MaxHpResource;
                        }
                    }
                    if (currency !== "5449016a4bdc2d6f028b456f") {
                        price = round(price / priceTable[currency]);
                    }
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
        const { database: { templates: { Categories, Items } } } = require('../../app.mjs');
        for (const purchaseCategorie of this.base.sell_category) {
            const traderCategories = Categories.filter(categorie => categorie.Id === purchaseCategorie);
            for (const traderCategorie of traderCategories) {
                /**
                 * If there is no ParentId for the parrent category, that mean it's a main category (weapons, meds, food...).
                 * we retrieve every subcategory (shotgun, rifle, snipers would be some of the subs for WEAPON)
                 */
                if (!traderCategorie.ParentId) {
                    const subCategories = Categories.filter(categorie => categorie.ParentId === traderCategorie.Id);
                    for (const subCategorie of subCategories) {
                        // Retrieve the item from the templates database since it contains the parentId (category)
                        const itemData = Items.filter(dbItem => dbItem.Id === item._tpl)[0];
                        if (itemData) {
                            if (subCategorie.Id === itemData.ParentId) {
                                return true;
                            }
                        }
                    }
                } else {
                    const itemData = Items.filter(dbItem => dbItem.Id === item._tpl)[0];
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
    async getBarterSchemeById(itemID) {
        if (this.assort.barter_scheme.hasOwnProperty(itemID)) return this.assort.barter_scheme[itemID][0];
        return "";
    }

    async getItemLoyalLevelById(itemID) {
        if (this.assort.loyal_level_items.hasOwnProperty(itemID)) return this.assort.loyal_level_items[itemID];
        return "";
    }

    /**
     * Convert trader assort offers to the ragfair offer format
     */
    async getRagfairOffers(trader) {
        const convertedOffers = [];
        let offerIntID = 1;

        for (const item of trader.assort.items) {
            if (item.slotId === "hideout") {
                const user = {
                    id: trader.base._id,
                    memberType: 4
                };

                const fullItem = {};
                if (childlessList.includes(item._id)) {
                    fullItem.item = [item];
                } else {
                    fullItem.item = await Item.findAndReturnChildrenAsItems(item._id, trader.assort.items);
                }

                fullItem.barter = await this.getBarterSchemeById(trader.base._id, item._id);
                fullItem.loyality = await this.getItemLoyalLevelById(trader.base._id, item._id);

                const newOffer = new RagfairOffer();
                if (item.upd.BuyRestrictionMax) {
                    await newOffer.loadOffer(offerIntID, fullItem, user, this.assort.nextResupply, { current: item.upd.BuyRestrictionCurrent, max: item.upd.BuyRestrictionMax });
                } else {
                    await newOffer.loadOffer(offerIntID, fullItem, user, this.assort.nextResupply);
                }
                convertedOffers.push(newOffer);
                offerIntID += 1;
            }
        }
        return convertedOffers;
    }

/*     static async getTraderByName(traderName) {
        const traders = await Trader.getAllWithoutKeys();
        for (const trader of traders) {
            if (trader.base.nickname === traderName) {
                return trader;
            }
        }
        return false;
    } */

/*     static async getTraderBase(traderId) {
        const { base } = await Trader.get(traderId);
        return base;
    } */

    /**
     * Convert all item._id to mongoIDs format.
     * We also need to change the modified parentID to the corresponding mongoID.
     */
    static async convertAssortMongoID(traderAssort) {
        const convertedIds = {};

        // we do a first pass to map old id with MongoID and replace the old id
        for (const item of traderAssort.items) {
            const mongoID = await generateMongoID();
            convertedIds[item._id] = mongoID;
            item._id = mongoID;
        }

        // we need to update parentId to their corresponding mongoID
        for (const item of traderAssort.items) {
            if (convertedIds[item.parentId]) {
                item.parentId = convertedIds[item.parentId];
            }
        }

        // we need to update loyal level items
        const newLoyal = {};
        for (let [key, value] of Object.entries(traderAssort.loyal_level_items)) {
            if (convertedIds[key]) {
                key = convertedIds[key];
            }
            newLoyal[key] = value;
        }
        traderAssort.loyal_level_items = newLoyal;


        // we need to update the barter scheme
        const newBarter = {};
        for (let [key, value] of Object.entries(traderAssort.barter_scheme)) {
            if (convertedIds[key]) {
                key = convertedIds[key];
            }
            newBarter[key] = value;
        }
        traderAssort.barter_scheme = newBarter;

        return traderAssort;
    }
}

module.exports.Trader = Trader;

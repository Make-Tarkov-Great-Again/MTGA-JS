const { BaseModel } = require("./BaseModel");
const { Trader } = require("./Trader");

class Customization extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    /**
     * Return Customization instance using the id of the trader offer.
     * @param {string} offerID
     * @returns {Promise<Customization>}
     */
    static async getCustomizationByTraderOfferId(offerID) {
        const traders = await Trader.getAllWithoutKeys();

        for (let t = traders.length -1; t > 0; t--) {
            const trader = traders[t]
            const traderSuitesOffers = await trader.getSuitsOffers();
            if (traderSuitesOffers) {
                for (let o = traderSuitesOffers.length - 1; o > 0; o--) {
                    const offer = traderSuitesOffers[o]
                    if (offer._id === offerID) {
                        return Customization.get(offer.suiteId);
                    }
                }
            }
        }
        return false;
    }
}

module.exports.Customization = Customization;

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
        for (const trader of traders) {
            const traderSuitesOffers = await trader.getSuitsOffers();
            if (traderSuitesOffers) {
                for (const offer of traderSuitesOffers) {
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

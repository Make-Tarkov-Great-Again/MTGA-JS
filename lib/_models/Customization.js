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
        const traders = Trader.getAll().filter(t => t.suits)

        for (const trader of traders) {
            const offers = await Trader.getSuits(trader);
            for (const offer of offers) {
                if (offer._id === offerID) {
                    const suite = await Customization.get(offer.suiteId);
                    return suite;
                }
            }

        }
        return false;
    }
}

module.exports.Customization = Customization;

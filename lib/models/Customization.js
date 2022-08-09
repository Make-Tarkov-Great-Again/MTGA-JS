const { BaseModel } = require("./BaseModel");
const { Trader } = require("./Trader");

class Customization extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    static async findSuiteInTraderOffers(offerID) {
        const traders = await Trader.getAllWithoutKeys();
        for (const trader of traders) {
            const traderSuitesOffers = await trader.getSuitsOffers();
            if (traderSuitesOffers) {
                for (const offer of traderSuitesOffers) {
                    if (offer._id === offerID) {
                        return offer.suiteId;
                    }
                }
            }
        }
    }
}

module.exports.Customization = Customization;
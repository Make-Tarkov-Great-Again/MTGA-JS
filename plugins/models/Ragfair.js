const { BaseModel } = require("./BaseModel");
const { FastifyResponse } = require("../utilities");

class Ragfair extends BaseModel {
    constructor(id) {
        super();

        this.createDatabase(id);
    }

    async sortOffers(request, offers) {
        // Sort results
        switch (request.sortType) {
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

    async getOffers(request) {
        const sessionID = await FastifyResponse.getSessionID(request);

        if (request.offerOwnerType === 1){ 
            return await this.getOffersFromTraders(request, sessionID); 
        }

        let output = { 
            categories: {}, 
            offers: [], 
            offersCount: 10, 
            selectedCategory: "5b5f78dc86f77409407a7f8e" 
        }

        let itemsToAdd = [];
        let offers = [];
    }

    async getOffersFromTraders(request, sessionID) {
        
    }


}

module.exports.Ragfair = Ragfair;
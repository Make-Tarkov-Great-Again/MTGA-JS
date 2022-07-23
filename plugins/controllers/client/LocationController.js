const { Location } = require("../../models");

class LocationController {
    static async clientLocationGetLocalloot(request, reply) {
        const name = request.body.locationId.toLowerCase();
        const variant = request.body.variantId;
        const locations = await Location.getAll();
        if (locations[name]) {
            const location = locations[name][variant];
            return FastifyResponse.zlibJsonReply(
                reply,
                FastifyResponse.applyBody(location)
            );
        }
    }
}
module.exports.LocationController = LocationController;
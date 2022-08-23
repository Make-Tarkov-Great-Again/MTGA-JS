const { Location } = require('../models/Location');
const { FastifyResponse } = require("../../utilities");

class LocationController {
    static async clientLocationGetLocalloot(request, reply) {
        const name = request.body.locationId.toLowerCase();
        const variant = (request.body.variantId - 1);
        const locations = await Location.get(name);

        const location = locations[variant];
        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(location)
        );
    }
}
module.exports.LocationController = LocationController;

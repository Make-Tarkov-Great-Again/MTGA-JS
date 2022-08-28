const { Location } = require('../models/Location');
const { FastifyResponse } = require("../../utilities");
const { Profile } = require('../models/Profile');


class LocationController {
    static async clientLocationGetLocalloot(request, reply) {
        const { raid: { lastLocation } } = await Profile.get(await FastifyResponse.getSessionID(request));

        const name = request.body.locationId.toLowerCase();
        const variant = (request.body.variantId - 1);
        const locations = await Location.get(name);

        const location = locations[variant];

        lastLocation.name = location;
        lastLocation.insurance = location.Insurance;


        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(location)
        );
    }
}
module.exports.LocationController = LocationController;

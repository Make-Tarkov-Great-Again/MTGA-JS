const { Location } = require('../models/Location');
const { FastifyResponse, isUndefined } = require("../../utilities");
const { Profile } = require('../models/Profile');


class LocationController {
    static async clientLocationGetLocalloot(request, reply) {
        const profile = await Profile.get(await FastifyResponse.getSessionID(request))

        const name = request.body.locationId.toLowerCase();
        const variant = (request.body.variantId - 1);
        const locations = await Location.get(name);
        const location = locations[variant];

        if (profile.raid) {
            profile.raid.lastLocation.name = name;
            profile.raid.lastLocation.insurance = location.Insurance;
        } else {
            profile["raid"] = []
            profile.raid["lastLocation"] = {
                name: name,
                insurance: location.Insurance
            }
        }
        await profile.save();


        return FastifyResponse.zlibJsonReply(
            reply,
            FastifyResponse.applyBody(location)
        );
    }
}
module.exports.LocationController = LocationController;

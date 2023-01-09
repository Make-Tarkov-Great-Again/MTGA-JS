const { Location } = require('../models/Location');
const { Response } = require("../utilities");
const { Profile } = require('../models/Profile');


class LocationController {
    static async clientLocationGetLocalloot(request, reply) {
        const profile = await Profile.get(await Response.getSessionID(request))

        const name = request.body.locationId.toLowerCase();
        const locations = await Location.get(name);
        const location = locations.presets[request.body.variantId];

        if (profile.raid && profile.raid.lastLocation) {
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


        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(location)
        );
    }
    static async testData(request, reply) {
        const location2 = await Location.generateLocationData("bigmap");
        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(location2)
        );
    }
}
module.exports.LocationController = LocationController;

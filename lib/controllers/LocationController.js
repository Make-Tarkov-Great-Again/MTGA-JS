const { Location } = require('../models/Location');
const { Response } = require("../utilities");
const { Profile } = require('../models/Profile');


class LocationController {

    /**
     * Using only for updating profile raid data.
     * @param {any} request
     * @param {string} name
     * @returns {null} void
     */
    static async _updateProfileWhenEnteringMap(request, name) {
        const profile = await Profile.get(await Response.getSessionID(request))
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
    }

    /**
     * Get preset location data, loot, waves etc. as response to the client
     * @param {any} request
     * @param {any} reply
     * @returns {string} zlib compressed json string
     */
    static async clientLocationGetLocalloot(request, reply) {
        const name = request.body.locationId.toLowerCase();
        const location_data = await Location.get(name);

        const location_preset_data = location_data.presets[request.body.variantId];

        // propably can be put in async cause its not required to be waited on...
        await _updateProfileWhenEnteringMap(request, name);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(location_preset_data)
        );
    }

    /**
     * Generate location data, loot, waves etc. as response to the client
     * @param {any} request
     * @param {any} reply
     * @returns {string} zlib compressed json string
     */
    static async clientLocationGetGeneratedLoot(request, reply) {
        const name = request.body.locationId.toLowerCase();

        const generated_location_data = await Location.generateLocationData(name);

        // propably can be put in async cause its not required to be waited on...
        await _updateProfileWhenEnteringMap(request, name);

        return Response.zlibJsonReply(
            reply,
            await Response.applyBody(generated_location_data)
        );
    }
    
    /**
     * test route just for internal usage for testing output by easly calling backend url
     * @param {any} request
     * @param {any} reply
     * @returns {string} zlib compressed json string
     */
    static async testData(request, reply) {
        const staticMapName = "bigmap";
        const location_data = await Location.generateLocationData(staticMapName);
        if(typeof location_data != "undefined"){
            console.log(`Name: ${location_data.Name}`)
            console.log(`Loot: ${location_data.Loot.length}`)
            console.log(`Waves: ${location_data.waves.length}`)
            console.log(`BossWaves: ${location_data.BossLocationSpawn.length}`)
        }
        return Response.textJsonReply(
            reply,
            await Response.applyBody(location_data)
        );
    }
}
module.exports.LocationController = LocationController;

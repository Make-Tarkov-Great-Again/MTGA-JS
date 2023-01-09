const { Response } = require("../utilities");

class BundlesController {
    constructor() {
        this.bundles = [];
    }

    /**
     * Return all bundles
     * @returns 
     */
    static async getBundles(reply) {
        return Response.zlibJsonReply(
            reply,
            []);
    }
}
module.exports.BundlesController = BundlesController;
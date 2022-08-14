const { FastifyResponse } = require("../../utilities");

class BundlesController {
    constructor() {
        this.bundles = [];
    }

    /**
     * Return all bundles
     * @returns 
     */
    static async getBundles(reply) {
        return FastifyResponse.zlibJsonReply(reply, []);
    }
}
module.exports.BundlesController = BundlesController;
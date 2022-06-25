class BundlesController {
    constructor() {
        this.bundles = [];
    }

    /**
     * Return all bundles
     * @returns 
     */
    static async getBundles() {
        return this.bundles;
    }
}
module.exports.BundlesController = BundlesController;
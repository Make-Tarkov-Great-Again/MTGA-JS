import { Response } from "../utilities/_index.mjs";

export class BundlesController {
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
import { database } from "../../app.mjs";
import { Response } from "../classes/_index.mjs";
import { readParsed } from "../utilities/_index.mjs";

export class BundlesController {
    constructor() {
        this.bundles = {};

    }
    BUNDLE(modPath, bundle, bundlePath, bundleFilePath) {
        return {
            modPath: modPath,
            key: bundle.key,
            path: bundlePath,
            filepath: bundleFilePath,
            dependencyKeys: bundle.dependencyKeys || []
        }
    }

    /**
     * Return all bundles
     * @returns 
     */
    async getBundles(reply) {
        const result = [];

        for (const path of database.bundles) {
            await this.addBundles(path);
        }

        const isLocal = (database.core.serverConfig.ip === "127.0.0.1" || database.core.serverConfig.ip === "localhost")
        for (const bundle in this.bundles) {
            result.push(await this.getBundle(bundle, isLocal))
        }

        return Response.zlibJsonReply(reply, result);
    }

    async getBundle(key, isLocal) {
        const bundle = await structuredClone(this.bundles[key]);

        if (isLocal) {
            bundle.path = bundle.filepath;
        }

        delete bundle.filepath;
        return bundle;
    }

    async addBundles(modPath) {
        const { manifest } = await readParsed(`${modPath}/bundles.json`, false);

        for (const bundle of manifest) {
            const bundlePath = `${Response.getBackendUrl()}files/bundle/${bundle.key}`;
            const bundleFilepath = bundle.path || `${modPath}/bundles/${bundle.key}`.replace(/\\/g, "/");
            this.bundles[bundle.key] = this.BUNDLE(modPath, bundle, bundlePath, bundleFilepath);
        }
    }
}
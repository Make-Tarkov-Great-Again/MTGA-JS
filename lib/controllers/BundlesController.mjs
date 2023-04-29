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
        const IP = database.core.serverConfig.ip;
        await Promise.all(database.bundles.map(path => this.addBundles(path)));

        const isLocal = IP === '127.0.0.1' || IP === 'localhost';
        const result = await Promise.all(Object.keys(this.bundles).map(bundle => this.getBundle(bundle, isLocal)));

        return Response.zlibJsonReply(reply, result);
    }

    getBundle(key, isLocal) {
        const bundle = { ...this.bundles[key] };

        if (isLocal) {
            bundle.path = bundle.filepath;
        }

        delete bundle.filepath;
        return bundle;
    }

    async addBundles(modPath) {
        const { manifest } = await readParsed(`${modPath}/bundles.json`, false);
        const baseUrl = Response.getBackendUrl() + 'files/bundle/';

        await Promise.all(manifest.map(async (bundle) => {
            const bundlePath = baseUrl + bundle.key;
            const bundleFilepath = bundle.path || `${modPath}/bundles/${bundle.key}`.split('\\').join('/');

            this.bundles[bundle.key] = await this.BUNDLE(modPath, bundle, bundlePath, bundleFilepath);
        }));
    }
}
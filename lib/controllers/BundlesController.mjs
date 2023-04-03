import { cloneDeep, readParsed, zlibJsonReply } from "../utilities/_index.mjs";

export class BundlesController {
    static BUNDLE(modPath, bundle, bundlePath, bundleFilePath) {
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
    static async getBundles(reply, local = null) {
        const result = [];

        if (local != null) {
            for (const bundle in this.bundles) {
                result.push(this.getBundle(bundle, local));
            }
        }

        return zlibJsonReply(reply, result);
    }

    static async getBundle(key, local) {
        const bundle = await cloneDeep(this.bundles[key]);

        if (local) {
            bundle.path = bundle.filepath;
        }

        delete bundle.filepath;
        return bundle;
    }

    static async addBundles(modPath) {
        const { manifest } = await readParsed(`${modPath}bundles.json`);

        for (const bundle of manifest) {
            const bundlePath = `${getBackendUrl()}/files/bundle/${bundle.key}`;
            const bundleFilepath = bundle.path || `${modPath}bundles/${bundle.key}`.replace(/\\/g, "/");
            this.bundles[bundle.key] = this.BUNDLE(modPath, bundle, bundlePath, bundleFilepath);
        }
    }
}
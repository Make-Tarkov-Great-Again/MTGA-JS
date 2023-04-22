import { database } from "../../app.mjs";
import {
    readParsed, read, getDirectoriesFrom, getFilesFrom,
    fileExist, createDirectory, logger, writeFile, stringify,
    getModTimeFormat, getAbsolutePathFrom, readdir, deleteFile
} from "../utilities/_index.mjs";

const MOD_PATH = "user/mods/";

export class Mod {
    static async setUtilities() {
        const dir = getAbsolutePathFrom("lib/utilities/");
        const directory = await getFilesFrom(dir, false);
        const utilities = {};
        const excludedFiles = ["_index.mjs"];

        for (const key of directory) {
            if (!excludedFiles.includes(key)) {
                await import("file:\\" + dir + key)
                    .then((module) => {
                        Object.assign(utilities, module);
                    })
                    .catch((err) => {
                        logger.error(`[${key}] failed importing: ${err}`)
                    });
            }
        }
        return utilities;
    }

    static CORE_MODS = [
        "AKI Compatibility Layer"
    ];

    /**
    * Sets the mods for the application.
    * 
    * @returns {Promise<void>} A promise that resolves when the mods have been set.
    */
    static async setMods() {
        const dirPath = getAbsolutePathFrom(`/user/mods`);
        let modDirectory = await getDirectoriesFrom(dirPath, false);
        if (!modDirectory) {
            await createDirectory(dirPath, false);
            modDirectory = [];
        }

        if (modDirectory.length === 0) {
            return;
        }

        this.mods = {
            core: {},
            community: {},
            akiCommunityMods: {},
            incompatibleMods: {},
        };

        for (let i = 0, length = modDirectory.length; i < length; i++) {
            const mod = modDirectory[i];
            const modPath = `${dirPath}/${mod}`;
            const rootFiles = await readdir(modPath);

            if (!rootFiles.includes('package.json')) {
                logger.error(`[${mod}] does not include package.json, invalid mod!`);
                continue;
            }
            const packagePath = `${modPath}/package.json`
            const packageInfo = await readParsed(packagePath, false);

            const modInfo = await this.setModInfo(packageInfo, this.mods, modPath);

            if (modInfo.log.length > 5) { //log cleanup
                modInfo.log.splice(6, 1);
            }
        }

        if (Object.values(this.mods).length === 0) return;

        for (const key in this.mods) {
            if (Object.values(this.mods[key]).length === 0) {
                delete this.mods[key];
                continue;
            }

            if (!this.mods.core.hasOwnProperty("AKI Compatibility Layer")) {
                delete this.mods[key];
            }
        }

        await this.updateModInfo(dirPath);

        this.utilities = await this.setUtilities();

    }

    static async updateModInfo(dirPath) {
        if (await fileExist(`${dirPath}/mods.json`, false)) {
            const original = stringify(await readParsed(`${dirPath}/mods.json`, false), true);
            const current = stringify(this.mods, true);
            if (original !== current)
                await writeFile(`${dirPath}/mods.json`, stringify(this.mods), false);
        } else {
            await writeFile(`${dirPath}/mods.json`, stringify(this.mods), false);
        }
    }


    /**
    * Sets the mod info for a given package.
    * 
    * @param {Object} packageInfo - The package information object.
    * @param {Object} mods - An object containing the core, community, and incompatible mods.
    * @param {String} modPath - The path to the mod.
    * 
    * @returns {Object} The mod info object.
    */
    static async setModInfo(packageInfo, mods, modPath) {
        let modInfo;
        let modType;

        // Check if the CORE_MODS array has the package name as a property
        if (this.CORE_MODS.includes(packageInfo.name)) {
            modType = mods.core;
        }
        else if (packageInfo.akiVersion) {
            modType = mods.akiCommunityMods;
        }
        else {
            modType = mods.community;
        }

        // If the mod type already has the package name as a property, return the mod info
        if (modType.hasOwnProperty(packageInfo.name)) {
            return modType[packageInfo.name];
        }

        modInfo = await this.generateModInfo(packageInfo, modPath);
        // If the mod does not have a main file, add it to the incompatible mods
        if (!modInfo.main) {
            mods.incompatibleMods[packageInfo.name] = modInfo;
        }
        else {
            modType[packageInfo.name] = modInfo;
        }

        return modInfo;
    }

    /**
    * Generates mod info from a given package info and mod path.
    * 
    * @param {JSON} packageInfo - The package info object.
    * @param {String} modPath - The path to the mod.
    * 
    * @returns {JSON} output - An object containing the mod info.
    */
    static async generateModInfo(packageInfo, modPath) {
        const output = {
            author: packageInfo.author,
            version: packageInfo.version,
            main: "",
            log: []
        };

        const type = await this.modVersionCheck(output, packageInfo);

        const srcPath = `${modPath}/${packageInfo.main}`;

        if (await fileExist(`${modPath}/bundles.json`))
            database.bundles.push(modPath);

        if (srcPath.includes("mod.mjs")) {
            output.main = srcPath;
        } else if (srcPath.includes("mod.js") && packageInfo.akiVersion) {
            const path = await fileExist(srcPath) ? srcPath : srcPath.replace(".js", ".ts");
            output.dir = modPath;
            output.main = path;

            if (type == "") {
                if (await fileExist(`${modPath}/scrubbed.txt`)) {
                    output.cleaned = true;
                } else {
                    output.cleaned = false;
                }
            } else {
                if (await fileExist(`${modPath}/scrubbed.txt`))
                    await deleteFile(`${modPath}/scrubbed.txt`);
                output.cleaned = false;
            }

        } else {
            logger.error(`${packageInfo.name} does not have a "mod" file, or the "mod" file extension is invalid!`);
            return false;
        }

        output.log.unshift(`[${packageInfo.name}] was added on ${getModTimeFormat()}`);
        return output;
    }

    /**
    * Checks if the version of the mod is different from the version of the package. 
    * If it is, logs a message and adds an entry to the log array in the modInfo object. 
    * If the log array is longer than 5 entries, removes the oldest one.
    * 
    * @param {Object} modInfo - Object containing information about the mod
    * @param {Object} packageInfo - Object containing information about the package
    * 
    */
    static async modVersionCheck(modInfo, packageInfo) {
        let type = "";

        if (modInfo.version !== packageInfo.version) {
            if (modInfo.version > packageInfo.version) {
                logger.info(`[${packageInfo.name}] has been downgraded since last server start`);
                type = "downgraded"
            }
            else if (modInfo.version < packageInfo.version) {
                logger.info(`[${packageInfo.name}] has been updated since last server start`);
                type = "updated"
            }
            modInfo.log.unshift(`[${packageInfo.name}] was ${type} on ${getModTimeFormat()}`);
        }
        return type;
    }





    static async loadMods() {
        const mods = [this.mods.core, this.mods.community, this.mods.akiCommunityMods];

        for (const modType of mods) {
            if (!modType) continue;

            await Promise.all(Object.keys(modType).map(async key => {
                const data = modType[key];

                if (data.bundlePath) {
                    database.bundles.push(data.bundlePath);
                }

                if (modType === this.mods.core) {
                    await this.loadCoreMod(data, key);
                } else if (modType === this.mods.community) {
                    await this.loadCommunityMod(data, key);
                } else if (modType === this.mods.akiCommunityMods && this["AKI Compatibility Layer"]) {
                    await this.tryLoadAkiMod(data, key);
                }
            }));
        }
    }

    static async loadCoreMod(data, key) {
        const { mod } = await import("file://" + data.main);
        if (!mod) {
            logger.warn(`[${key}] Mod was unable to be loaded because it is either empty, or exported incorrectly! 
            Check bug reports before reporting this error!`);
            return;
        }

        mod.utilities = this.utilities;
        mod.database = database;
        this[key] = await mod.initialize();
    }

    static async loadCommunityMod(data, key) {
        const { mod } = await import("file://" + data.main);
        if (!mod) {
            logger.warn(`[${key}] Mod was unable to be loaded because it is either empty, or exported incorrectly! 
            Check bug reports before reporting this error!`);
            return;
        }

        mod.container = this.utilities;
        await mod.initialize();
    }

    static async tryLoadAkiMod(data, key) {
        const shim = this["AKI Compatibility Layer"];

        if (!data.cleaned) {
            if (data.main.includes(".ts")) {
                await shim.toolkit.refactorAkiMod(data.dir);

                await writeFile(data.dir + "/scrubbed.txt", stringify("heheheheheh"), false);
                data.main = data.main.replace(".ts", ".js");
            }
            else {
                const readFile = await read(data.main, false);
                if (readFile.toString().includes("Object.defineProperty(exports, \"__esModule\", { value: true });")) {
                    logger.warn(`[${key}] Mod was unable to be loaded because it is a pre-compiled .ts to .js file!`);
                    return;

                    // need to figure out how to shim pre-compiled mods lol
                    //await shim.toolkit.refactorAkiMod(data.dir);
                    //await writeFile(data.dir + "/scrubbed.txt", stringify("heheheheheh"), false);
                }
            }
        }

        const { mod } = await import("file://" + data.main);
        if (!mod) {
            logger.warn(`[${key}] Mod was unable to be loaded because it is either empty, or exported incorrectly! 
            Check bug reports before reporting this error!`);
            return;
        }

        if (mod.postDBLoadAsync) {
            await mod.postDBLoadAsync(shim.container);
        }
        if (mod.postDBLoad) {
            await mod.postDBLoad(shim.container);
        }
        //if can't load, return false so we can check what is incompatible
    }
}
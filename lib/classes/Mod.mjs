import { database } from "../../app.mjs";
import {
    readParsed, read, getDirectoriesFrom, getFilesFrom, getFilepath,
    fileExist, createDirectory, logger, writeFile, stringify, loadModule,
    getModTimeFormat, getAbsolutePathFrom, readdir, deleteFile
} from "../utilities/_index.mjs";


export class Mod {
    static async setUtilities() {
        const dir = getAbsolutePathFrom("lib/utilities/");
        const directory = await getFilesFrom(dir, false);
        const utilities = {};
        const excludedFiles = ["_index.mjs"];

        for (const key of directory) {
            if (!excludedFiles.includes(key)) {
                await loadModule(getFilepath(dir + key))
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
            if (key === "akiCommunityMods" && !this.mods.core.hasOwnProperty("AKI Compatibility Layer")) {
                delete this.mods[key];
            }
            if (Object.values(this.mods[key]).length === 0) {
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
            output.cleaned = await this.checkForScrub(type, modPath);
            output.dir = modPath;
            output.main = path;

        } else {
            logger.error(`${packageInfo.name} does not have a "mod" file, or the "mod" file extension is invalid!`);
            return false;
        }

        output.log.unshift(`[${packageInfo.name}] was added on ${getModTimeFormat()}`);
        return output;
    }

    static async checkForScrub(type, modPath) {
        if (type == "") {
            return !!(await fileExist(`${modPath}/scrubbed.txt`));
        } else {
            if (await fileExist(`${modPath}/scrubbed.txt`))
                await deleteFile(`${modPath}/scrubbed.txt`);
            return false;
        }
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
        if (modInfo.version === packageInfo.version) {
            return "";
        }

        const type = modInfo.version > packageInfo.version ? "downgraded" : "updated";
        logger.info(`[${packageInfo.name}] has been ${type} since last server start`);
        modInfo.log.unshift(`[${packageInfo.name}] was ${type} on ${getModTimeFormat()}`);
        return type;
    }


    /**
     * WE LOAD MODS HERE HAHAHHAHAHAHAHHAHAHAHAHHAHAHAHAHAH
     */


    static async loadMods() {
        for (const modType in this.mods) {
            for (const [key, data] of Object.entries(this.mods[modType])) {
                if (data.bundlePath) {
                    database.bundles.push(data.bundlePath);
                }

                switch (modType) {
                    case "core":
                        await this.loadCoreMod(data, key);
                        break;
                    case "community":
                        await this.loadCommunityMod(data, key);
                        break;
                    case "akiCommunityMods":
                        await this.tryLoadAkiMod(data, key);
                        break;
                }
            }
        }
    }

    static async loadCoreMod(data, key) {
        const path = getFilepath(data.main);
        try {
            const { mod } = await loadModule(path);
            if (!mod) {
                throw new Error("Mod is empty or exported incorrectly");
            }
            mod.utilities = this.utilities;
            mod.database = database;
            this[key] = await mod.initialize();
        } catch (error) {
            logger.warn(`[${key}] Mod was unable to be loaded: ${error.message}`);
        }
    }

    static async loadCommunityMod(data, key) {
        try {
            const { mod } = await loadModule(getFilepath(data.main));
            if (!mod) {
                throw new Error("Mod is empty or exported incorrectly");
            }
            mod.container = this.utilities;
            await mod.initialize();
        } catch (error) {
            logger.warn(`[${key}] Mod was unable to be loaded: ${error.message}`);
        }
    }

    static async tryLoadAkiMod(data, key, shim = this["AKI Compatibility Layer"]) {
        if (!data.cleaned) {
            await this.prepareAkiMod(data, shim.toolkit);
        }

        const path = getFilepath(data.main);
        try {
            const { mod } = await loadModule(path);
            if (!mod) {
                throw new Error("Mod is empty or exported incorrectly");
            }

            if (mod.postDBLoadAsync) {
                await mod.postDBLoadAsync(shim.container);
            }
            if (mod.postDBLoad) {
                await mod.postDBLoad(shim.container);
            }
        } catch (error) {
            logger.warn(`[${key}] Mod failed to load: ${error.message}`);
        }
    }

    static async prepareAkiMod(data, toolkit) {
        if (data.main.endsWith(".ts")) {
            await toolkit.refactorAkiMod(data.dir);
            await writeFile(data.dir + "/scrubbed.txt", "heheheheheh", false);
            data.main = data.main.replace(".ts", ".js");
        } else {
            const readFile = await read(data.main, false);
            if (readFile.toString().includes("Object.defineProperty(exports, \"__esModule\", { value: true });")) {
                await toolkit.refactorAkiMod(data.dir);
                await writeFile(data.dir + "/scrubbed.txt", "heheheheheh", false);
            }
        }
    }
}
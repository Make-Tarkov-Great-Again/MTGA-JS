import { database } from "../../app.mjs";
import path from "path";
import {
    readParsed, read, getDirectoriesFrom, getFilesFrom,
    fileExist, createDirectory, getDirname,
    logger, writeFile, stringify, getModTimeFormat, getAbsolutePathFrom, readdir, isDirectory
} from "../utilities/_index.mjs";

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
    ]

    static getTranspilerOptions(modPath) {
        return {
            compilerOptions: {
                noEmitOnError: true,
                noImplicitAny: false,
                target: ScriptTarget.ES2020,
                module: ModuleKind.CommonJS,
                resolveJsonModule: true,
                allowJs: true,
                esModuleInterop: true,
                downlevelIteration: true,
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
                rootDir: modPath,
                isolatedModules: true
            }
        }
    }

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
            if (packageInfo.akiVersion) {
                await this.recursiveAkiModRewriting(modPath);
            }

            const modInfo = await this.setModInfo(packageInfo, this.mods, modPath);
            await this.modVersionCheck(modInfo, packageInfo);

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

        if (await fileExist(`${dirPath}/mods.json`, false)) {
            const original = stringify(await readParsed(`${dirPath}/mods.json`, false), true);
            const current = stringify(this.mods, true);
            if (original !== current)
                await writeFile(`${dirPath}/mods.json`, stringify(this.mods), false);
        } else {
            await writeFile(`${dirPath}/mods.json`, stringify(this.mods), false);
        }

        this.utilities = await this.setUtilities();

    }

    static async recursiveAkiModRewriting(modPath) {
        const files = await readdir(modPath);
        const regex = /bundle|\.json|\.md|\.ts|\.txt/;
        const snapshotPath = "C:/snapshot/project/obj";
        const replacedPath = path.join(modPath.substring(modPath.indexOf('/user') + 1), "..").replace(/\\/g, "/");

        for (const file of files) {
            if (regex.test(file)) continue;

            const newPath = `${modPath}/${file}`;
            if (await isDirectory(newPath)) {
                await this.recursiveAkiModRewriting(newPath);
                continue;
            }
            const readFile = await read(newPath, false);
            let replaced = readFile.toString().replace(snapshotPath, replacedPath);

            while (replaced.includes(snapshotPath)) {
                replaced = replaced.replace(snapshotPath, replacedPath);
            }

            await writeFile(newPath, replaced, false);
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

    static async loadMods() {
        const mods = [this.mods.core, this.mods.community, this.mods.akiCommunityMods];

        for (const modType of mods) {
            if (!modType) continue;

            for (const key in modType) {
                const data = modType[key];

                if (data.bundlePath) {
                    database.bundles.push(data.bundlePath);
                }

                const { mod } = await import("file://" + data.main);
                if (!mod) {
                    logger.warn(`[${key}] Mod was unable to be loaded because it is either empty, or exported incorrectly! 
              Check bug reports before reporting this error!`);
                    continue;
                }

                if (modType === this.mods.core) {
                    mod.utilities = this.utilities;
                    mod.database = database;
                    this[key] = await mod.initialize();
                } else if (modType === this.mods.community) {
                    mod.container = this.utilities;
                    await mod.initialize();
                } else if (modType === this.mods.akiCommunityMods && this["AKI Compatibility Layer"]) {
                    await this.dealWithAkiMod(mod);
                }
            }
        }
    }

    static async dealWithAkiMod(mod) {
        const shim = this["AKI Compatibility Layer"];
        if (mod.postDBLoadAsync) {
            await mod.postDBLoadAsync(shim);
        }
        if (mod.postDBLoad) {
            await mod.postDBLoad(shim);
        }
        //if can't load, return false so we can check what is incompatible

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
        }

        const TIME = getModTimeFormat();

        //lets see if we can read ts files
        const srcPath = `${modPath}/${packageInfo.main}`;

        if (await fileExist(`${modPath}/bundles.json`)) {
            database.bundles.push(modPath);
        }

        if (packageInfo.main.includes("mod.js") || srcPath.includes("mod.mjs"))
            output.main = `${modPath}/${packageInfo.main}`;

        else if (packageInfo.main.includes("mod.ts")) {
            logger.warn("TypeScript transpiling not currently implemented!");
            return;
            output.main = `${modPath}/${packageInfo.main}`;
        }
        else {
            logger.error(`${packageInfo.name} does not have a "mod" file, or the "mod" file extension is invalid!`);
            return false;
        }

        output.log.unshift(`[${packageInfo.name}] was added on ${TIME}`);
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
        if (modInfo.version !== packageInfo.version) {
            let type = "";
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
    }

    static async compileTS() {
        //read .TS to string, replace shit that doesn't work with regex, transpile, write to .JS
        return;
    }

}
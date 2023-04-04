import { database } from "../../app.mjs";
import {
    readParsed, getDirectoriesFrom, getFilesFrom, fileExist, createDirectory,
    logger, writeFile, stringify, getModTimeFormat, getAbsolutePathFrom
} from "../utilities/_index.mjs";

export class Mod {

    static async setUtilities() {
        const dir = getAbsolutePathFrom("lib/utilities/");
        const directory = await getFilesFrom(dir, false);
        const utilities = {};
        const excludedFiles = ["_index.mjs"];

        for (const key of directory) {
            if (!excludedFiles.includes(key)) {
                console.log(`[${key}] found`);

                await import("file:\\" + dir + key)
                    .then((module) => {
                        console.log(`[${key}] importing`);
                        Object.assign(utilities, module);
                        console.log(`[${key}] imported`);
                    })
                    .catch((err) => {
                        console.log(`[${key}] failed importing`);
                        console.log(err)
                    });
            }
        }
        return utilities;
    }

    static coreMods() {
        return {
            "AKI Compatibility Layer": false
        }
    }

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

        this.list = this.coreMods();
        const mods = await fileExist(`${dirPath}/mods.json`, false)
            ? await readParsed(`${dirPath}/mods.json`, false)
            : {
                core: {},
                community: {},
                akiCommunityMods: {},
                incompatibleMods: {},
            };

        const original = stringify(mods, true); //for comparison later

        for (let i = 0, length = modDirectory.length; i < length; i++) {
            const mod = modDirectory[i];
            const modPath = `${dirPath}/${mod}`;
            const rootFiles = await getFilesFrom(modPath, false);

            if (!rootFiles.includes('package.json')) {
                logger.error(`[${mod}] does not include package.json, invalid mod!`);
                continue;
            }
            const packagePath = `${modPath}/package.json`
            const packageInfo = await readParsed(packagePath, false);

            const modInfo = await this.setModInfo(packageInfo, mods, modPath);
            await this.modVersionCheck(modInfo, packageInfo);

            if (modInfo.log.length > 5) { //log cleanup
                modInfo.log.splice(6, 1);
            }
        }

        const current = stringify(mods, true);
        if (original !== current)
            await writeFile(`${dirPath}/mods.json`, stringify(mods), false);


        this.mods = {};

        for (const key in mods) {
            if (Object.values(mods[key]).length === 0) continue;
            if (key !== "akiCommunityMods") {
                this.mods[key] = mods[key];
                continue;
            }

            if (this.mods.core.hasOwnProperty("AKI Compatibility Layer")) {
                this.mods[key] = mods[key];
            } else {
                logger.warn("[AKI Compatibility Layer] not found - AKI Mods will not be loaded.");
            }
        }

        this.utilities = await this.setUtilities();
        console.log("what is happening")
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

        // Check if the coreMods object has the package name as a property
        if (this.coreMods().hasOwnProperty(packageInfo.name)) {
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

        if (this.mods.core) {
            const core = this.mods.core;
            for (const key in core) {
                const data = core[key];
                const { mod } = await import("file://" + data.main);
                this.bind(this, mod.container);
                if (!mod) {
                    logger.error(`[${key}] Core mod was unable to be loaded because it is either empty, or exported incorrectly! 
                    Check bug reports before reporting this error!`);
                    continue;
                }
                console.log("HALT NIGGA");
            }
        }

        if (Object.values(this.akiMods).length > 0) {
            for (const key in this.akiMods) {
                const data = this.akiMods[key];
                const { mod } = await import("file://" + data.main);
                await this.dealWithAkiMod(mod);
            }
        }
    }

    static async loadMod() { }

    static async dealWithAkiMod(mod) {
        await this.shimAKIModByType(mod);
        //check and shim by type ---- postDBLoadAsync or postDBAkiLoad
        //create shim with getContainer() to create necessary plugs
        //load??????
        //if can't load, return false so we can check what is incompatible

    }

    static async shimAKIModByType(mod) {
        if (mod.postDBLoadAsync) {
            const data = mod.postDBLoadAsync();
            return;
        }
        if (mod.postDBLoad) {
            return;
        }
    }

    static getContainer() {
        return {
            resolve: (name) => {
                switch (name) {
                    case "DatabaseServer":
                        return {
                            getTables: () => {
                                return {
                                    locales: database.locales,
                                    templates: {
                                        items: {},
                                        handbook: {
                                            Items: {}
                                        }
                                    }
                                };
                            }
                        };
                    case "PreAkiModLoader":
                        return {};
                    case "ImporterUtil":
                        return {};
                    default:
                        return null;
                }
            }
        }
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

        //cache or tamper mod returns!!!!!!!!!!!!!!!!!
        //postDBLoad*Async // isPreAkiLoad*Async
        //postLoad // preLoad

        //lets see if we can read ts files
        const srcPath = await fileExist(`${modPath}/src`, false) ? `${modPath}/src` : modPath;
        const srcFiles = await getFilesFrom(srcPath, false);

        if (await fileExist(`${modPath}/bundles`)) {
            output.bundlePath = await getAbsolutePathFrom(`${modPath}/bundles`);
        }

        let fileType = null;
        if (srcFiles.includes("mod.js") || srcFiles.includes("mod.mjs")) {
            fileType = srcFiles.includes("mod.js") ? "mod.js" : "mod.mjs"
            logger.info(`[${packageInfo.name}] was added on ${TIME}`);
        }
        if (srcFiles.includes("mod.ts")) {
            fileType = "mod.ts";
            logger.warn(`[${packageInfo.name}] may not work because it is written in TypeScript.`);
        }
        if (!fileType) {
            logger.error(`${packageInfo.name} does not have a "mod" file, or the "mod" file extension is invalid!`);
        }
        output.main = fileType ? `${srcPath}/${fileType}` : false;
        output.log.unshift(fileType ? `[${packageInfo.name}] was added on ${TIME}` : `${packageInfo.name} does not have a "mod" file, or the "mod" file extension is invalid!`);
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
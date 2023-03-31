import { database } from "../../app.mjs";

import {
    readParsed, getDirectoriesFrom, getFilesFrom, fileExist, createDirectory,
    logger, writeFile, stringify, getModTimeFormat, getAbsolutePathFrom
} from "../utilities/_index.mjs";

export class Mod {

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
        const modDirectory = await getDirectoriesFrom(dirPath, false);
        if (!modDirectory) {
            return createDirectory(dirPath, false);
        }

        if (modDirectory.length === 0) {
            return;
        }

        const mods = await fileExist(`${dirPath}/mods.json`, false)
            ? await readParsed(`${dirPath}/mods.json`, false)
            : {};

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

            if (!mods[packageInfo.name]) {
                mods[packageInfo.name] = await this.generateModInfo(packageInfo, modPath)
            }

            const modInfo = mods[packageInfo.name];
            await this.modVersionCheck(modInfo, packageInfo);
        }

        const current = stringify(mods, true);
        if (original !== current)
            await writeFile(`${dirPath}/mods.json`, stringify(mods), false);
        this.mods = mods;
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
            bundlePath: "",
            isAKImod: null,
            log: []
        }

        const TIME = getModTimeFormat();

        if (packageInfo?.akiVersion) {
            output.isAKImod = true;
            output.log.unshift(`[${packageInfo.name}] is an SPT-AKI server mod ${TIME}`);
            //return output;
        }

        //lets see if we can read ts files
        const srcPath = await fileExist(`${modPath}/src`, false) ? `${modPath}/src` : modPath;
        const srcFiles = await getFilesFrom(srcPath, false);

        if (srcFiles.includes("mod.js") && srcFiles.includes("mod.ts") || srcFiles.includes("mod.js")) {
            output.main = `${srcPath}/mod.js`;
            output.log.unshift(`[${packageInfo.name}] was added on ${TIME}`);
            logger.info(`[${packageInfo.name}] was added on ${TIME}`);
            return output;
        }
        if (srcFiles.includes("mod.ts")) {
            output.main = `${srcPath}/mod.ts`;
            output.log.unshift(`[${packageInfo.name}] was added on ${TIME}`);
            logger.warn(`[${packageInfo.name}] may not work because it is written in TypeScript.`);
            return output;
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
            if (modInfo.log.length > 5) {
                modInfo.log.splice(6, 1);
            }
        }
    }

    static async compileTS() {
        //read .TS to string, replace shit that doesn't work with regex, transpile, write to .JS
        return;
    }

}
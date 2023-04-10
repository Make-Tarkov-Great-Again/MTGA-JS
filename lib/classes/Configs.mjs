process.removeAllListeners('warning');
import { ConfigController } from "../controllers/ConfigController.mjs";
import { database } from "../../app.mjs";
export class DefaultConfigs {
    static async OnServerStartConfigs(gameplay) {
        await this.Gameplay() .then( await this.OnCallGameplay(gameplay))
    }
    static async Gameplay() {
        await ConfigController.registerNewConfigEntry("Fleamarket", "FleaEnable", "Enabled", "checkbox", true)
        await ConfigController.registerNewConfigEntry("Fleamarket", "MinLevel", "Minimum Level ", "number", "15")
        await ConfigController.registerNewConfigEntry("Fleamarket", "BlackList", "Use blacklist", "checkbox", false)
        await ConfigController.registerNewConfigEntry("Fleamarket", "LivePrices", "Use live prices", "checkbox", true)
        await ConfigController.registerNewConfigEntry("Hideout", "fastScavcase", "Fast Scav Case", "checkbox", true)
        await ConfigController.registerNewConfigEntry("Hideout", "fastProduction", "Fast Production", "checkbox", true)
        await ConfigController.registerNewConfigEntry("Location", "raidTimerMultiplier", "Raid Timer Mutiplier", "number", "1")
    }
    static async OnCallGameplay(gameplay) {
        gameplay.trading.flea.enabled = ConfigController.getValue("Fleamarket", "FleaEnable")
        gameplay.trading.flea.minUserLevel = ConfigController.getValue("Fleamarket", "MinLevel")
        gameplay.trading.flea.removeBlacklist = ConfigController.getValue("Fleamarket", "BlackList")
        gameplay.trading.flea.liveFleaPrices = ConfigController.getValue("Fleamarket", "LivePrices")
        gameplay.hideout.fastScavcase = ConfigController.getValue("Hideout", "fastScavcase")
        gameplay.hideout.fastProduction = ConfigController.getValue("Hideout", "fastProduction")
        gameplay.location.raidTimerMultiplier = ConfigController.getValue("Location", "raidTimerMultiplier")
    }
}
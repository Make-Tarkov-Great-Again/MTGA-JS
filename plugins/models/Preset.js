const { BaseModel } = require("./BaseModel");
const database = require("../../engine/database");

class Preset extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    /**
     * Create weapon Preset database
     * @returns 
     */
    static async initialize() {
        const presets = Object.values(database.core.globals.ItemPresets);
        const reverse = {};

        for (const preset of presets) {
            let tpl = preset._items[0]._tpl;

            if (!(tpl in reverse)) {
                reverse[tpl] = [];
            }
            // weaponID[presetID] = preset database
            reverse[tpl][preset._id] = preset;
        }
        return reverse;
    }

    /**
     * Check if Preset exists for a weapon
     * @param {*} weaponID // ID of weapon to check
     * @returns 
     */
    static async weaponHasPreset(weaponID) {
        return weaponID in await this.getAll();
    }

    /**
     * Get all available Presets for a weapon
     * @param {*} weaponID // ID of weapon to check
     * @returns 
     */
    static async getPresetsForWeapon(weaponID) {
        if (await this.weaponHasPreset(weaponID)) {
            const presets = await this.getAll();
            return presets[weaponID];
        }
    }

    /**
     * Get all available Presets for each weapon
     * @returns 
     */
    static async getAllPresets(){
        return this.getAll();
    }

    /**
     * Get Preset with PresetID
     * @param {*} presetID 
     * @returns 
     */
    static async getPresetWithPresetId(presetID) {
        const presets = await this.getAllPresets();
        for (const weapon in presets) {
            if (presetID in presets[weapon]) {
                return presets[weapon][presetID];
            }
        }
    }

    static async createCustomPreset(){
        return "your mom gay"
    }
}

module.exports.Preset = Preset;
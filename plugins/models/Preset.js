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

        for (const p of presets) {
            let tpl = p._items[0]._tpl;

            if (!(tpl in reverse)) {
                reverse[tpl] = [];
            }
            // weaponID[presetID] = preset database
            reverse[tpl][p._id] = p;
        }
        return reverse;
    }

    /**
     * Check if Preset exists for a weapon
     * @param {*} weaponID // ID of weapon to check
     * @returns 
     */
    static async hasPresets(weaponID) {
        return weaponID in await this.getAll();
    }

    /**
     * Get all Presets for a weapon
     * @param {*} weaponID // ID of weapon to check
     * @returns 
     */
    static async getPresets(weaponID) {
        if (await this.hasPresets(weaponID)) {
            const presets = await this.getAll();
            return presets[weaponID];
        }
    }

    /**
     * lost track of what i was doing here
     * @param {*} weaponID 
     * @param {*} presetID 
     * @returns 
     */
    static async getPreset(weaponID, presetID) {
        const presets = await this.getPresets(weaponID);
        for (const p in presets) {
            const preset = presets[p];
            if (preset === presetID) {
                return preset;
            }
        }
    }
}

module.exports.Preset = Preset;
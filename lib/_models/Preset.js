const { BaseModel } = require("./BaseModel");
//const { logger } = require("../utilities/index.mjs").default;
//const { database: { core: { globals: { ItemPresets } } } } = require('../../app');


class Preset extends BaseModel {
    constructor(id) {
        super(id);

        this.createDatabase(id);
    }

    /**
     * Create item Preset database
     * @returns 
     */
    static async initialize() {
        const presets = Object.values(ItemPresets);
        const reverse = {};

        for (const preset of presets) {
            let tpl = preset._items[0]._tpl;

            if (!(tpl in reverse)) {
                reverse[tpl] = [];
            }
            // item[presetID] = preset database
            reverse[tpl][preset._id] = preset;
        }
        return reverse;
    }

    /**
     * Check if Preset exists for a item
     * @param {*} item // ID of item to check
     * @returns 
     */
    static async itemHasPreset(item) {
        const presets = await this.getAllPresets();
        return item in presets;
    }

    /**
     * Get all available Presets for a item
     * @param {*} item // ID of item to check
     * @returns 
     */
    static async getPresetsForItem(item) {
        const presets = await this.getAllPresets();
        return presets[item];
    }

    /**
     * Get all available Presets for each item
     * @returns 
     */
    static async getAllPresets() {
        return this.getAll();
    }

    /**
     * Get Preset with PresetID
     * @param {*} presetID 
     * @returns 
     */
    static async getPresetWithPresetId(presetID) {
        const presets = await this.getAllPresets();
        for (const item in presets) {
            if (presetID in presets[item]) {
                return presets[item][presetID];
            }
        }
    }

    static async createCustomPreset() {
        return "your mom gay"
    }
}

module.exports.Preset = Preset;
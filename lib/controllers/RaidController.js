const { Account } = require('../models/Account');
const { FastifyResponse } = require("../../utilities");


class RaidController {
    static async raidProfileSave(request, _reply) {
        const endRaidData = request.body;
        const playerAccount = await Account.get(await FastifyResponse.getSessionID(request));
        const playerProfile = await playerAccount.getProfile();
        const character = await playerProfile.getPmc();
        character.Stats = endRaidData.profile.Stats;
        character.Info.Level = endRaidData.profile.Info.Level;
        character.Info.Experience = endRaidData.profile.Info.Experience;
        character.Quests = endRaidData.profile.Quests;
        character.ConditionCounter = endRaidData.profile.ConditionCounters;

        await character.setHealth(endRaidData.health);

        character.Encyclopedia = endRaidData.profile.Encyclopedia;
        await playerProfile.save();
    }
}

module.exports.RaidController = RaidController;

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

        character.Health.Hydration.Current = endRaidData.health.Hydration;
        character.Health.Energy.Current = endRaidData.health.Energy;
        for (const bodyPart in character.Health.BodyParts) {
            character.Health.BodyParts[bodyPart].Health.Current = endRaidData.health.Health[bodyPart].Current;
            // I am not sure at all how Effects work, I would need to trigger a broken part to see how to proceed
            if (endRaidData.health.Health[bodyPart].Effects) {
                character.Health.BodyParts[bodyPart].Effects = endRaidData.health.Health[bodyPart].Effects;
            }
        }
        character.Encyclopedia = endRaidData.profile.Encyclopedia;
        await playerProfile.save();
    }
}

module.exports.RaidController = RaidController;

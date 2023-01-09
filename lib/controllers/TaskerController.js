const { Profile } = require('../models/Profile');
const { tasker } = require('../../app');


class TaskerController {


    static async runTasks(sessionID) {
        const profile = await Profile.get(sessionID)

        await tasker.addTask(
            sessionID + "_process_notifications",
            profile.processMailbox,
            profile,
            1000,
            1
        );

        await tasker.addTask(
            sessionID + "_process_insurance",
            profile.processInsuranceReturn,
            profile,
            1000,
            1
        );

    }
}
module.exports.TaskerController = TaskerController
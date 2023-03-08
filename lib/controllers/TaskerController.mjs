//import { Profile } from '../models/Profile';

import { Notification } from '../classes/_index.mjs';
import { default as tasker } from '../engine/Tasker.mjs';

export class TaskerController {

    static async runTasks(sessionID) {
        await tasker.addTask(
            sessionID + "_process_notifications",
            Notification.processMailbox(sessionID),
            Notification,
            1000,
            1
        );

        await tasker.addTask(
            sessionID + "_process_insurance",
            Notification.processInsuranceReturn(sessionID),
            Notification,
            1000,
            1
        );

    }
}
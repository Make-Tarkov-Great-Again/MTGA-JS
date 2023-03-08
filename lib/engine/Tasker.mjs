import { logger } from "../utilities/_index.mjs";

class Tasker {
    constructor() {
        this.taskList = [];
        this.tick = 100;
    }

    /**
     * Adds a Task to the scheduler
     * @param {*} taskId Should be unique, otherwise it will overwrite an existing task.
     * @param {*} functionToAdd The function to call once the task is called.
     * @param {*} functionContext The context in with the function should be executed.
     * @param {*} scheduleTimeInMs The amount of delay, default is 1000 and minimum delay is the tasker.tick variable
     * @param {*} scheduleAmount The amount of times to execute this task, default is infinite.
     */
    async addTask(taskId, functionToAdd, functionContext = undefined, scheduleTimeInMs = 1000, scheduleAmount = 0) {
        const task = await this.getTask(taskId);
        if (!task) {
            this.taskList.push({
                id: taskId,
                context: functionContext,
                function: functionToAdd,
                recurrance: 1,
                scheduleTimeRecurrance: 1,
                scheduleAmount,
                scheduleTimeInMs
            });
        } else {
            task.context = functionContext;
            task.function = functionToAdd;
            task.scheduleAmount = scheduleAmount;
            task.scheduleTimeInMs = scheduleTimeInMs;
            task.recurrance = 1;
            task.scheduleTimeRecurrance = 1;
        }
    }

    /**
     * Gets a task from the taskList using the taskId.
     * @param {*} taskId
     * @returns
     */
    async getTask(taskId) {
        return this.taskList.find(task => task.id === taskId);
    }

    /**
     * Starts the tasker. Only to be run once in app.mjs!
     */
    async execute() {
        if (this.taskList && this.taskList.length !== 0) {
            for (const task of this.taskList) {
                if (typeof task.function === "undefined")
                    continue;
                if (!task.timer || typeof task.timer !== "undefined" && task.timer._idlePrev === null) {
                    if (typeof task.context !== 'undefined') {
                        task.timer = setTimeout(task.function.bind(task.context), task.scheduleTimeInMs);
                    } else {
                        task.timer = setTimeout(task.function, task.scheduleTimeInMs);
                    }

                    if (task.scheduleAmount !== 0 && task.recurrance >= task.scheduleAmount) {
                        this.taskList.splice(this.taskList.indexOf(task), 1);
                    } else {
                        task.scheduleTimeRecurrance = 1;
                        task.recurrance += 1;
                    }
                }
            }
        }
        setTimeout(this.execute.bind(this), this.tick);
    }
}

export default new Tasker();

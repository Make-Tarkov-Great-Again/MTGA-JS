const { logger } = require("../../utilities");

class Tasker {
    constructor() {
        this.taskList = []
        this.tick = 100;
    }

    /**
     * Adds a Task to the scheduler
     * @param {*} taskId Should be unique, otherwise it will overwrite an existing task.
     * @param {*} functionToAdd The function to call once the task is called.
     * @param {*} scheduleTimeInMs The amount of delay, default is 1000 and minimum delay is the tasker.tick variable
     * @param {*} scheduleAmount The amount of times to execute this task, default is infinite.
     */
    async addTask(taskId, functionToAdd, scheduleTimeInMs = 1000, scheduleAmount = 0) {
        let task = await this.getTask(taskId);
        if(!task) {
            this.taskList.push({
                id: taskId,
                function: functionToAdd,
                scheduleAmount: scheduleAmount,
                scheduleTimeInMs: scheduleTimeInMs,
                recurrance: 1,
                scheduleTimeRecurrance: 1
            });
        } else {
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
     * Starts the tasker. Only to be run once in app.js!
     */
    async execute() {
        for(let task of this.taskList) {
            const requiredCycles = task.scheduleTimeInMs / this.tick

            if(requiredCycles < 1 || task.scheduleTimeRecurrance >= (requiredCycles - 1)) {
                task.function();

                if(task.scheduleAmount != 0 && task.recurrance >= task.scheduleAmount) {
                    this.taskList.splice(this.taskList.indexOf(task), 1);
                } else {
                    task.scheduleTimeRecurrance = 1;
                    task.recurrance += 1;
                }

            } else {
                task.scheduleTimeRecurrance += 1;
            }
        }

        setTimeout(this.execute.bind(this), this.tick);
    }
}

module.exports = new Tasker();
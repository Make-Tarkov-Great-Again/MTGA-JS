'use strict'
const logger = require('../../utilities/logger');
const weblauncher = require('../handlers/weblauncher');
const fastJson = require('fast-json-stringify');
const {
    account: {
        find,
        register,
        getEditions,
        remove,
        changeEmail,
        changePassword,
        reloadAccountByLogin,
        wipe
    },
    database: {
        profiles,
        core
    }
} = require(`../../../app`);

module.exports.weblauncherRoutes = {
    '/weblauncher/home': async () => {
        return weblauncher.display("hello");
    },

    '/weblauncher/files/:file': async () => {
        logger.logDebug(this);
        //const { file } = request.params;
        //return weblauncher.readFile(file);
    },
}
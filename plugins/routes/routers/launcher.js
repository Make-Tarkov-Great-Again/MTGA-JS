'use strict'
const fastJson = require('fast-json-stringify');
const {
    find,
    register,
    getEditions,
    remove,
    changeEmail,
    changePassword,
    reloadAccountByLogin,
    wipe
} = require('./../../../app').account;
const database = require('./../../../app').database;
const { clearString, noBody } = require(`./../../utilities/response`);

module.exports.launcherRoutes = {
    '/launcher/profile/change/email': async (url, info, sessionID) => {
        let output = changeEmail(info);
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/profile/change/password': async (url, info, sessionID) => {
        let output = changePassword(info);
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/profile/wipe': async (url, info, sessionID) => {
        let output = wipe(info);
        return (output === "" ? "FAILED" : "OK")
    },

    '/launcher/profile/get': async (url, info, sessionID) => {
        const serverConfig = database.core.serverConfig
        const accountID = reloadAccountByLogin(info);
        let output = find(accountID);
        return clearString(output["server"] = serverConfig.name)
    },

    '/launcher/profile/login': async (url, info, sessionID) => {
        let output = reloadAccountByLogin(info);
        return noBody(output);
    },

    '/launcher/profile/register': async (url, info, sessionID) => {
        const output = register(info);
        AE.server.log.info(output);
        return (output === "" ? "FAILED" : output);
    },

    '/launcher/profile/remove': async (url, info, sessionID) => {
        let output = remove(info)
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/server/connect': async (url, info, sessionID) => {
        const data = getEditions(database)
        const connectSchema = fastJson({
            backendURL: 'string',
            name: 'string',
            editions: 'string'
        });
        const output = connectSchema({
            backendURL: "https://" + database.core.serverConfig.ip + ":" + database.core.serverConfig.port,
            name: database.core.serverConfig.name,
            editions: data
        })
        return output;
    }
}

'use strict'
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
const { noBody } = require('../../utilities/response');

module.exports.launcherRoutes = {
    '/launcher/profile/change/email': async (url, info, sessionID) => {
        let output = await changeEmail(info);
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/profile/change/password': async (url, info, sessionID) => {
        let output = await changePassword(info);
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/profile/wipe': async (url, info, sessionID) => {
        let output = await wipe(info);
        return (output === "" ? "FAILED" : "OK")
    },

    '/launcher/profile/register': async (url, info, sessionID) => {
        const output = await register(info);
        app.log.info(output);
        return (output === "" ? "FAILED" : output);
    },

    '/launcher/profile/remove': async (url, info, sessionID) => {
        let output = await remove(info)
        return (output === "" ? "FAILED" : "OK");
    },

    '/launcher/profile/get': async (url, info, sessionID) => {
        const serverConfig = database.core.serverConfig
        const accountID = await reloadAccountByLogin(info);
        let output = find(accountID);
        return noBody(output["server"] = serverConfig.name);
    },

    '/launcher/server/connect': async (url, info, sessionID) => {
        const data = await getEditions(profiles)
        const server = core.serverConfig;
        return (JSON.stringify(
            {
                backendURL: "https://" + server.ip + ":" + server.port,
                name: server.name,
                editions: data
            }
        ));
    },

    '/launcher/profile/login':
        async (url, info, sessionID) => {
            return noBody(reloadAccountByLogin(info));
        }
}
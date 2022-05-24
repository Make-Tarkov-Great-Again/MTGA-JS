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
} = require(`./../../../app`);
const { noBody } = require(`./../../utilities/response`);

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
        const accountID = await reloadAccountByLogin(info);
        let output = find(accountID);
        return noBody(output["server"] = serverConfig.name)
    },

    '/launcher/profile/login': async (url, info, sessionID) => {
        let output = await reloadAccountByLogin(info);
        return noBody(output, true);
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
        const data = await getEditions(profiles)
        const server = core.serverConfig;
        const connectSchema = fastJson({
            backendURL: 'string',
            name: 'string',
            editions: 'array'
        });
        const output = connectSchema({
            backendURL: "https://" + server.ip + ":" + server.port,
            name: server.name,
            editions: data
        })
        return noBody(output);
    }
}

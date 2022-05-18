'use strict'
const fastJson = require('fast-json-stringify');
const Account = require('./../handlers/account');

module.exports.launcherRoutes = {
    '/launcher/profile/change/email': async (url, info, sessionID) => {
        return `/launcher/profile/change/email route is working`;
    },

    '/launcher/profile/change/password': async (url, info, sessionID) => {
        return `/launcher/profile/change/password route is working`;
    },

    '/launcher/profile/wipe': async (url, info, sessionID) => {
        return `/launcher/profile/change/wipe route is working`;
    },

    '/launcher/profile/get': async (url, info, sessionID) => {
        return`/launcher/profile/get route is working`;
    },

    '/launcher/profile/login': async (url, info, sessionID) => {
        return`/launcher/profile/login route is working`;
    },

    '/launcher/profile/register': async (url, info, sessionID) => {
        const mockinfo = {
            id: `king`,
            email: `king`,
            password: `king`,
            wipe: true,
            edition: `Developer`,
        }
        const output = Account.register(mockinfo);
        AE.server.log.info(output);
        return (output === undefined
            || output === null
            || output === ''
            ? 'FAILED'
            : output);
    },

    '/launcher/profile/remove': async (url, info, sessionID) => {
        return "/launcher/profile/remove route is working";
    },

    '/launcher/server/connect': async (url, info, sessionID) => {
        const connectSchema = fastJson({
            backendURL: 'string',
            name: 'string',
            editions: 'string'
        });
        const output = connectSchema({
            backendURL: "https://" + AE.serverConfig.ip + ":" + AE.serverConfig.port,
            name: AE.serverConfig.name,
            editions: Object.keys(AE.database.profiles)
        })
        return (output)
    }
}

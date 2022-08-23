const {
    account: {
        find, register, getEditions, remove,
        changeEmail, changePassword, reloadAccountByLogin,
        wipe },
    database: { profiles, core: { serverConfig: { name } } }
} = require('../../app');
const { noBody, logger } = require('../utilities');

module.exports = async function launcherRoutes(app, _opts) {

    app.get('/launcher/profile/change/email', async (request, _reply) => {
        const output = await changeEmail(request.body);
        return (output === "" ? "FAILED" : "OK");
    });

    app.get('/launcher/profile/change/password', async (request, _reply) => {
        const output = await changePassword(request.body);
        return (output === "" ? "FAILED" : "OK");
    });

    app.post('/launcher/profile/wipe', async (request, _reply) => {
        const output = await wipe(request.body);
        return (output === "" ? "FAILED" : "OK");
    });

    app.post('/launcher/profile/register', async (request, _reply) => {
        const output = await register(request.body);
        logger.logDebug("[LAUNCHER REGISTER]: " + output);
        return (output === "" ? "FAILED" : output);
    });

    app.post('/launcher/profile/remove', async (request, _reply) => {
        const output = await remove(request.body)
        return (output === "" ? "FAILED" : "OK");
    });

    app.get('/launcher/profile/get', async (request, _reply) => {
        const accountID = await reloadAccountByLogin(request.body);
        const output = find(accountID);
        return noBody(output["server"] = name);
    });

    app.get('/launcher/server/connect', async (_request, _reply) => {
        const data = getEditions(profiles);
        const server = core.serverConfig;
        const output = {
            backendURL: "https://" + server.ip + ":" + server.port,
            name: server.name,
            editions: data
        };
        logger.logDebug("[LAUNCHER CONNECT]: " + output);
        return noBody(output);
    });

    app.post('/launcher/profile/login', async (request, _reply) => {
        return noBody(reloadAccountByLogin(request.body));
    });

};

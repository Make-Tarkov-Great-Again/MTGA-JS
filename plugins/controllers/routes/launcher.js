'use strict'
const fastJson = require('fast-json-stringify');
const {
    app,
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

module.exports = async function launcherRoutes(app, opts) {
    app.post(`/`, (request, reply) => {
        reply.send(request.body);
    })

    app.get('/launcher/profile/change/email', async (request, reply) => {
        let output = await changeEmail(request.body);
        reply.send(output === "" ? "FAILED" : "OK");
    });

    app.get('/launcher/profile/change/password', async (request, reply) => {
        let output = await changePassword(request.body);
        reply.send(output === "" ? "FAILED" : "OK");
    })

    app.post('/launcher/profile/wipe', async (request, reply) => {
        let output = await wipe(request.body);
        reply.send(output === "" ? "FAILED" : "OK")
    })

    app.post('/launcher/profile/register', async (request, reply) => {
        const output = await register(request.body);
        app.log.info(output);
        reply.send(output === "" ? "FAILED" : output);
    })

    app.post('/launcher/profile/remove', async (request, reply) => {
        let output = await remove(request.body)
        reply.send(output === "" ? "FAILED" : "OK");
    })



    app.get('/launcher/profile/get', async (request, reply) => {
        const serverConfig = database.core.serverConfig
        const accountID = await reloadAccountByLogin(request.body);
        let output = find(accountID);
        reply.compress(noBody(output["server"] = serverConfig.name));
    })

    app.get('/launcher/server/connect', async (request, reply) => {
        const data = getEditions(profiles)
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
        app.log.info(output);
        reply.compress(noBody(output));
    })

    app.post('/launcher/profile/login', async (request, reply) => {
        reply
        .compress(noBody(reloadAccountByLogin(request.body)));
    })
}
// Auth //
const { accountController } = require('../controllers/accountcontroller');
module.exports = async function webinterfaceAccountRoutes(app, opts) {
    app.get('/webinterface/account/test', async (request, reply) => {
        return await accountController.test(request, reply);
    })

    app.get('/webinterface/account/register', async (request, reply) => {
        return await accountController.create(request, reply);
    })

    app.post('/webinterface/account/register', async (request, reply) => {
        return await accountController.store(request, reply);
    })

    app.get('/webinterface/account/login', async (request, reply) => {
        return await accountController.showLogin(request,reply);
    })

    app.post('/webinterface/account/login', async (request, reply) => {
        return await accountController.login(request,reply);
    })

    app.get('/webinterface/account/logout', async (request, reply) => {
        reply.clearCookie('PHPSESSID', { path: '/' })
        reply.redirect('/');
    })
}
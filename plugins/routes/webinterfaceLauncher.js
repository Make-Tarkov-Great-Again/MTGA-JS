const { weblauncherController } = require('../controllers/weblaunchercontroller');

module.exports = async function webinterfaceLauncherRoutes(app, opts) {
    app.get('/webinterface/weblauncher/start', async (request, reply) => {
        return await weblauncherController.launch(request, reply)
    }) 
}
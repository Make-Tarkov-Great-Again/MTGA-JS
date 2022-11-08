const { ClientController } = require("../../controllers");

module.exports = async function accountRoutes(app, _opts) {

    app.post("/client/account/customization", async (request, reply) => {
        await ClientController.clientAccountCustomization(request, reply);
    });

};

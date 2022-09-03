const { InsuranceController } = require("../../lib/controllers")

module.exports = async function insuranceRoutes(app, _opts) {

    app.post(`/client/insurance/items/list/cost`, async (request, reply) => {
        await InsuranceController.insuranceCost(request, reply);
    })
}
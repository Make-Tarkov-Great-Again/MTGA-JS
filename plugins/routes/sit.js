 const { logger, FastifyResponse } = require("../utilities");
 
 module.exports = async function sitRoutes(app, _opts) {
  /*
   app.get(`/getBundleList`, async (_request, reply) => {
     await FastifyResponse.zlibJsonReply(
        reply,
        []
    );
   })*/

   //[Slejm] Post or Get? probably POST
   app.post(`/client/sit-validator`, async (_request, reply) => {
    await FastifyResponse.zlibJsonReply(
        reply,
        true
    );
  })
/*
  app.post(`/client/WebSocketAddress`, async (_request, reply) => {
    await FastifyResponse.zlibJsonReply(
        reply,
        FastifyResponse.getWebSocketUrl()
    );
  })
*/
}
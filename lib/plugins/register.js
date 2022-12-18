const fp = require('fastify-plugin');
module.exports = fp(async function (app, _opts) {

  await app.register(require("@fastify/cookie"), {
    secret: 'urmomisawesome',
    parseOptions: {}
  });

  await app.register(require('@fastify/compress'));

  await app.register(require('@fastify/formbody'));

  await app.register(require('@fastify/websocket'));

  await app.register(require('../routes/router'));

});

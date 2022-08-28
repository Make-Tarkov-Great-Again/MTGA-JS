const fp = require('fastify-plugin');

module.exports = fp(async function (app, _opts) {

  /**
   * A plugin for Fastify that adds support
   * for reading and setting cookies.
   * @see https://github.com/fastify/fastify-cookie
  */
     await app.register(require("@fastify/cookie"), {
      secret: 'urmomisawesome',
      parseOptions: {}
    });

  /**
   * Adds compression utils to the Fastify reply object
   * and a hook to decompress requests payloads.
   * Supports gzip, deflate, and brotli.
   * @see https://github.com/fastify/fastify-compress
   */
  await app.register(require('@fastify/compress'));

  /**
   * A simple plugin for Fastify that adds a content type parser
   * for the content type application/x-www-form-urlencoded.
   * @see https://github.com/fastify/fastify-formbody
   */
  await app.register(require('@fastify/formbody'));

  await app.register(require('@fastify/websocket'));

  /**
* Register Handler
*/
  await app.register(require('../routes/router.js'));

});

'use strict'
const qs = require("qs");

module.exports = async function registerPlugins(app, opts) {

  /**
   * Adds compression utils to the Fastify reply object 
   * and a hook to decompress requests payloads. 
   * Supports gzip, deflate, and brotli.
   * @see https://github.com/fastify/fastify-compress
   */
  await app.register(require('@fastify/compress'),
    {
      encodings: ['deflate'],
      requestEncodings: ['gzip'],
      removeContentLengthHeader: false,
      global: true,
      threshold: 0,
    });
  app.log.info("@fastify/compress is enabled");


  /**
   * Maybe I will need it in the future
   * Plugin for serving static files as fast as possible.
   * @see https://github.com/fastify/fastify-static
   
  app.register(require("@fastify/static"))
  app.log.info("@fastify/static is enabled");
  */


  /**
   * A plugin for Fastify that adds support 
   * for reading and setting cookies.
   * @see https://github.com/fastify/fastify-cookie
  */
  await app.register(require("@fastify/cookie"), {
    secret: 'urmomisawesome',
    parseOptions: {}
  })
  app.log.info('@fastify/cookie is enabled')

  /**
   * A simple plugin for Fastify that adds a content type parser 
   * for the content type application/x-www-form-urlencoded.
   * @see https://github.com/fastify/fastify-formbody
   */
  await app.register(require('@fastify/formbody'), { parser: str => qs.parse(str) })
  app.log.info('@fastify/formbody is enabled')

  /**
* Register Handler
*/
  await app.register(require('./handler.js'))
  app.log.info('Handler registered');
}
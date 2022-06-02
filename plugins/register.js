'use strict'
const fp = require('fastify-plugin');

module.exports = fp(async function registerPlugins(app, opts) {
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
   * Adds compression utilities to the Fastify reply object and 
   * a hook to decompress requests payloads.
   * Supports gzip, deflate, and brotli.
   * @see https://github.com/fastify/fastify-compress
  */
  await app.register(require('@fastify/compress'),
    {
      onInvalidRequestPayload: (request, encoding, error) => {
        return {
          statusCode: 400,
          code: 'BAD_REQUEST',
          error: 'Bad Request',
          message: 'This is not a valid ' + encoding + ' encoded payload: ' + error.message
        }
      }
    })
  app.log.info('@fastify/compress is enabled')

  await app.register(require(`@fastify/formbody`))
  app.log.info('@fastify/formbody is enabled')

  await app.register(require(`fastify-raw-body`),
    {
      runFirst: true,
      encoding: false
    })
  app.log.info('fastify-raw-body is enabled')

  //await app.register(require(`./handler`))
  //app.log.info('handler is enabled')

  await app.register(import(`fastify-print-routes`), {
    useColors: true
  })

  await app.register(require(`./router`)
  )
  app.log.info('Router registered');

})
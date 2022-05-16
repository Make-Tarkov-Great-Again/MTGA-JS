'use strict'
const fp = require('fastify-plugin');
const resolve = require('path').resolve;

module.exports = fp(async function registerPlugins(app, opts) {

  /**
  * Set response decorators for fastify instance.
  */
  await app.register(require('./decorators/response'))
  app.log.info('Response decorators loaded')

  /**
  * Set fileIO decorators for fastify instance.
  */
  await app.register(require('./decorators/fileIO'))
  app.log.info('FileIO decorators loaded')

  /**
  * Register Routers
  * I can't seem to get this to run out of `register.js`
  */
  await app.register(require('./routes/router.js'))
  app.log.info('Routers registered');

  /**
  * A plugin for Fastify that adds support 
  * for getting raw URL information from the request.
  * @see https://github.com/fastify/fastify-url-data
  
  await app.register(require('@fastify-url-data'))
  app.log.info('URL data plugin loaded')
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
  app.log.info('Cookie plugin loaded')

  /**
  * Adds compression utilities to the Fastify reply object and 
  * a hook to decompress requests payloads.
  * Supports gzip, deflate, and brotli.
  * @see https://github.com/fastify/fastify-compress
  */
  await app.register(require('@fastify/compress'), {
    encodings: ['deflate', 'gzip'],
    global: true
  })
  app.log.info('Compression is enabled')

  /**
   * Plugin for serving static files as fast as possible.
   * @see https://github.com/fastify/fastify-static
   */
  await app.register(require('@fastify/static'), {
    root: resolve('./database'),
  })
  app.log.info('Static files are served from /database')

  /**
   * A Fastify plugin for serving a Swagger UI, 
   * using Swagger (OpenAPI v2) or OpenAPI v3 schemas 
   * automatically generated from your route schemas, 
   * or from an existing Swagger/OpenAPI schema.
   * @see https://github.com/fastify/fastify-swagger
   */
  await app.register(require('@fastify/swagger'), {
    routePrefix: resolve('./docs'),
    swagger: {
      info: {
        title: 'AE Fastify Backend Documentation',
        description: 'Documentation for the AE Fastify Backend',
        version: '0.0.1'
      },
      host: 'localhost',
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json']
    },
    exposeRoute: true
  })
  app.log.info('Swagger UI is available at /docs')


  /**
  * This plugins adds some utilities to handle http errors
  * @see https://github.com/fastify/fastify-sensible
  */
  await app.register(require('@fastify/sensible'), {
    errorHandler: false
  })
  app.log.info('Sensible plugin loaded')
})
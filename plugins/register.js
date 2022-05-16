'use strict'
const fp = require('fastify-plugin')
/**
* This plugins adds some utilities to handle http errors
* @see https://github.com/fastify/fastify-sensible
*/
module.exports = fp(async function sensible(app, opts) {
  await app.register(require('@fastify/sensible'), {
    errorHandler: false
  })
})

/**
 * A Fastify plugin for serving a Swagger UI, 
 * using Swagger (OpenAPI v2) or OpenAPI v3 schemas 
 * automatically generated from your route schemas, 
 * or from an existing Swagger/OpenAPI schema.
 * @see https://github.com/fastify/fastify-swagger
 */
module.exports = fp(async function swagger(app, opts) {
  await app.register(require('@fastify/swagger'), {
  })
})


/**
 * Plugin for serving static files as fast as possible.
 * @see https://github.com/fastify/fastify-static
 */
module.exports = fp(async function static(app, opts) {
  await app.register(require('@fastify/static'), {})
})


/**
* Adds compression utilities to the Fastify reply object and 
* a hook to decompress requests payloads.
* Supports gzip, deflate, and brotli.
* @see https://github.com/fastify/fastify-compress
*/
module.exports = fp(async function fastifyCompress(app, opts) {
  await app.register(require('@fastify-compress'), {
    encodings: ['deflate', 'gzip'],
    global: true
  })
})

/**
 * A plugin for Fastify that adds support 
 * for reading and setting cookies.
 * @see https://github.com/fastify/fastify-cookie
 */
module.exports = fp(async function fastifyCookie(app, opts) {
  await app.register(require('@fastify-cookie'), {
    secret: 'urmomisawesome',
    parseOptions: {}
  })
})

/**
* A plugin for Fastify that adds support 
* for getting raw URL information from the request.
* @see https://github.com/fastify/fastify-url-data
*/
module.exports = fp(async function urlData(app, opts) {
  await app.register(require('@fastify-url-data'))
})

/**
* Set fileIO decorators for fastify instance.
*/
module.exports = fp(async function fileIO(app, opts) {
  await app.register(require('./decorators/fileIO'))
})

/**
* Set response decorators for fastify instance.
*/
module.exports = fp(async function response(app, opts) {
  await app.register(require('./decorators/response'))
})
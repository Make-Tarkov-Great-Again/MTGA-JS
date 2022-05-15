'use strict'
const fp = require('fastify-plugin')

/**
 * This plugins adds some utilities to handle http errors
 *
 * @see https://github.com/fastify/fastify-sensible
 */
async function sensible(app, opts) {
  app.register(require('@fastify/sensible'), {
    errorHandler: false
  })
}

/**
 * Register Route Handler
 */
async function routerCore(app, opts) {
  app.register(require('./routes/core'))
}

/**
 * Adds compression utils to the Fastify reply object and 
 * a hook to decompress requests payloads.
 * Supports gzip, deflate, and brotli.
 * https://github.com/fastify/fastify-compress
 */
async function fastifyCompress(app, opts) {
  app.register(require('fastify-compress'), {
    encodings: ['deflate', 'gzip'],
    global: true
  })
}

/**
 * Adds compression utils to the Fastify reply object and 
 * a hook to decompress requests payloads.
 * Supports gzip, deflate, and brotli.
 * https://github.com/fastify/fastify-compress
 */
async function fastifyCookie(app, opts) {
  app.register(require('fastify-cookie'), {
    secret: 'urmomisawesome',
    parseOptions: {}
  })
}

/**
 * A plugin for Fastify that adds support 
 * for getting raw URL information from the request.
 * https://github.com/fastify/fastify-url-data
 */
async function urlData(app, opts) {
  app.register(require('fastify-url-data'), {
    parse: true
  })
}

/**
 * Set fileIO decorators for fastify instance.
 */
async function fileIO(app, opts) {
  app.register(require('./decorators/fileIO'))
}

/**
 * Set response decorators for fastify instance.
 */
async function response(app, opts) {
  app.register(require('./decorators/response'))
}




module.exports = fp(sensible)
module.exports = routerCore
module.exports = fp(fastifyCompress)
module.exports = fp(fastifyCookie)
module.exports = fp(urlData)
module.exports = fp(fileIO)
module.exports = fp(response)
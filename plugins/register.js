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
* Adds compression utils to the Fastify reply object and 
* a hook to decompress requests payloads.
* Supports gzip, deflate, and brotli.
* @see https://github.com/fastify/fastify-compress
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
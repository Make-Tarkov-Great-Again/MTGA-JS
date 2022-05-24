'use strict'
const fp = require('fastify-plugin');
const { resolve } = require('path');

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
    global: true
  })
  app.log.info('@fastify/compress is enabled')

  await app.register(require(`@fastify/multipart`))
  app.log.info('@fastify/multipart is enabled')

  await app.register(require(`@fastify/formbody`))
  app.log.info('@fastify/formbody is enabled')

  /**
   * Register Handler
  */
  await app.register(require('./handler.js'))
  app.log.info('Handler registered');
})
import fp from 'fastify-plugin';
import cookies from '@fastify/cookie'
import compress from '@fastify/compress';
import websocket from '@fastify/websocket';
import formbody from '@fastify/formbody';
import router from '../routes/router.mjs';
import cors from '@fastify/cors';

export default fp(async function (app, _opts) {

  await Promise.allSettled([
    await app.register(cookies, {
      secret: 'urmomisawesome',
      parseOptions: {}
    }),

    await app.register(compress),
    await app.register(websocket),
    await app.register(formbody),
    await app.register(cors, {
      origin: true, // allow any origin
      methods: ['GET', 'POST'], // allow only these methods
      allowedHeaders: ['Content-Type'] // allow only these headers
    }),
    await app.register(router),

  ]);

});
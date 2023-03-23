import exe from '@angablue/exe'
import { logger } from '../lib/utilities/pino.mjs'

const build = exe({
    entry: './deploy/dist/MTGA.js',
    out: './deploy/dist/MTGA-Server.exe',
    pkg: ['-C', 'Brotli'],
    target: 'latest-win-x64',
    icon: './assets/templates/webinterface/resources/favicon.ico',
    properties: {
        ProductName: 'Make Tarkov Great Again',
        FileDescription: 'An `Escape from Tarkov` emulation server executable built with Fastify',
    }
});

build.then(() => logger.info('Executable completed and created!'));
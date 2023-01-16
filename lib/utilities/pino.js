const pino = require('pino');
const SonicBoom = require('sonic-boom');

const getFileName = () => {
    const date = Date.now() / 1000
    const time = date + (date < 0 ? -0.5 : 0.5) >> 0
    return `${time}.txt`;
}

const getLogsFolderPath = () => {
    return `${process.cwd()}/pinoLogs/`;
}

const log = pino({
    transport: {
        target: 'pino-pretty',
        options: {
            singleLine: true,
            colorize: true
        }
    },
    serializers: {
        req(request) {
            return `[${request.method}] ${request.url}`;
        },
        res(reply) {
            return `${reply.statusCode}`;
        }
    }
},
    pino.destination({
        dest: `${getLogsFolderPath()}${getFileName()}`,
        sync: false,
        mkdir: true,
        minLength: 1,
    })
);


module.exports = {
    log
}
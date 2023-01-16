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
            colorize: true
        }
    },
},
    pino.destination({
        dest: `${getLogsFolderPath()}${getFileName()}`,
        sync: false,
        append: true,
        mkdir: true,
    })
);


module.exports = {
    log
}
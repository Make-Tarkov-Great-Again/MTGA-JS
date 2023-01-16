const fs = require('fs');
const pino = require('pino');
const pinoms = require('pino-multi-stream');


const getFileName = () => {
    const date = Date.now() / 1000;
    const time = date + (date < 0 ? -0.5 : 0.5) >> 0;
    return `${time}.txt`;
};

const getLogsFolderPath = () => `${process.cwd()}/pinoLogs/`;


const streams = [
    { stream: process.stdout},
    { stream: fs.createWriteStream(`${getLogsFolderPath()}${getFileName()}`, { flags: 'a+' })}
];

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
    pinoms.multistream(streams)
);


module.exports = {
    log
};

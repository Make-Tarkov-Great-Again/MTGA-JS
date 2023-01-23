const pino = require('pino');
const pretty = require('pino-pretty');

const logTime = () => {
    const date = Date.now() / 1000
    const time = date + (date < 0 ? -0.5 : 0.5) >> 0
    return time;
}

const logName = () => {
    return `${logTime()}.txt`;
}

const logDirectory = () => {
    return `${process.cwd()}/logs/`;
}

const logPath = () => {
    return `${logDirectory()}${logName()}`;
}

const streams = [
    pretty({
        destination: pino.destination({ dest: logPath(), sync: false, mkdir: true }),
        singleLine: true,
        colorize: false,
        ignore: 'pid,hostname,reqId',
    }),
    pretty({
        singleLine: true,
        colorize: true,
        ignore: 'pid,hostname,reqId',
        sync: false
    }),
]

const serializers = {
    req(request) {
        return `[${request.method}] ${request.url}`;
    },
    res(reply) {
        return `${reply.statusCode}`;
    }
}

const logger = pino({
    serializers: serializers
},
    pino.multistream(streams)
);


module.exports = {
    logger
}

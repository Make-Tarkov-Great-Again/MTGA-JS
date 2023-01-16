const fs = require('fs');
const pino = require('pino');

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

const logger = pino({
    transport: {
        targets: [
            {
                target: 'pino-pretty',
                options: {
                    singleLine: true,
                    colorize: true,
                    ignore: 'pid,hostname,reqId',
                    sync: false
                }
            },
            {
                target: 'pino-pretty',
                options: {
                    destination: logPath(),
                    singleLine: true,
                    colorize: false,
                    ignore: 'pid,hostname,reqId',
                    mkdir: true,
                    sync: false
                }
            }
        ]
    },
    serializers: {
        req(request) {
            return `[${request.method}] ${request.url}`;
        },
        res(reply) {
            return `${reply.statusCode}`;
        }
    }
});


module.exports = {
    logger
}

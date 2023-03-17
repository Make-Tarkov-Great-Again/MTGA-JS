import pino from 'pino';

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

const serializers = {
    req(request) {
        return `[${request.method}] ${request.url}`;
    },
    res(reply) {
        return `${reply.statusCode}`;
    }
}

const transports = {
    targets: [
        {
            target: 'pino-pretty',
            options: {
                destination: 1,
                singleLine: true,
                ignore: 'pid,hostname,reqId',
                sync: false
            }
        },
        {
            target: 'pino-pretty',
            options: {
                destination: logPath(),
                ignore: 'pid,hostname,reqId',
                singleLine: true,
                colorize: false,
                mkdir: true,
                sync: false
            }
        }
    ],
    levels: {
        silent: Infinity,
        fatal: 60,
        error: 50,
        warn: 50,
        info: 30,
        debug: 20,
        trace: 10
    },
    dedupe: true
}

const logger = pino({
    level: 'trace',
    serializers: serializers,
},
    pino.transport(transports),
);

logger.on('ready', function () {
    process.exit(0)
});

export {
    logger
}
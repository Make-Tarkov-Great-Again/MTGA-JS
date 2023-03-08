import pino from 'pino';
import pretty from 'pino-pretty';

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

const streamOpts = {
    levels: {
        silent: Infinity,
        fatal: 60,
        error: 50,
        warn: 50,
        info: 30,
        debug: 20,
        trace: 10
    },
    dedupe: true,
}

const streams = [
    {
        level: 'trace', stream: pretty({
            destination: pino.destination({ dest: logPath(), sync: false, mkdir: true }),
            singleLine: true,
            colorize: false,
            ignore: 'pid,hostname,reqId',
            sync: false
        })
    },
    {
        level: 'trace', stream: pretty({
            singleLine: true,
            colorize: true,
            ignore: 'pid,hostname,reqId',
            sync: false
        })
    }
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
    level: 'trace',
    serializers: serializers,
},
    pino.multistream(streams, streamOpts)
);

export {
    logger
}
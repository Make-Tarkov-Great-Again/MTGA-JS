const cert = require('./source/certificategenerator');

const app = require('fastify')({
    logger: {
        prettyPrint: true
    },
    http2: true,
    https: {
        allowHTTP1: true,
        key: cert.KEY,
        cert: cert.CERT
    }
});

app.register(require
    ('@fastify/compress'),
    {
        encodings: ['deflate', 'gzip'],
        global: true
    }
);

app.register(require
    ('@fastify/cookie'),
    {
        secret: 'secret',
        parseOptions: {}
    }
);


const fs = require('fs');
const serverConfig = fs.readFileSync('./database/config/server.json');

app.get('/', function (request, reply) {
    let config = JSON.parse(serverConfig);

    reply.send({ config });
});



app.listen(3000, function (err, address) {
    if (err) {
        app.log.error(err);
        process.exit(1);
    }
    app.log.info(`Listening on ${address}`);
});
const serverConfig = fs.readFileSync('./database/config/server.json');

app.get('/', function (request, reply) {
    let config = JSON.parse(serverConfig);

    reply.send({ config });
});
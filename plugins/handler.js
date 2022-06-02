
module.exports = async function handler (app, opts){
    app.addHook('preValidation', (request, reply, done) => {
        const bodyLength = request.body ? request.body.length : "empty";
        app.log.info(`|[${request.method}]> ${request.url} [Body Length:${bodyLength}]`);
        if (request.method == "GET") {
            let body = [];
            request.raw.on('data', (chunk) => {
                body.push(chunk);
            })
            app.log.info(`|[${request.method}]> ${request.url} [Body Length:${body.length}]`)
            request.body = body;
        }
        if (request.method == "POST") {
            request.raw.on('data', function (data) {
                reply.inflate(data, function (err, body) {
                    request.body = body !== undefined && body !== null && body !== "" ? body.toString() : "{}";
                })
            })
        }

        done();
    })
}
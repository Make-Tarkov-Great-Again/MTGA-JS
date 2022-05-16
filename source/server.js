module.exports = async function startServer(app, opts) {
    try {
        await app.listen(3000, '127.0.0.1');
        app.log.info(`Server listening on ${app.server.address().port}`);
    } catch (err) {
        app.log.info(err);
        process.exit(1);
    }
}
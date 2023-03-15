import webinterface from "./lib/engine/WebInterface.mjs";
import Server from './lib/engine/Server.mjs';

await Promise.allSettled([
    await Server.setServerConfig(),
    await Server.registerCertificate(),
    await Server.setFastify(),
    await Server.printLogo(),
    await Server.registerPlugins(),
    await Server.setContentTypeParser(),
    await Server.initializeServer(),
]);

const app = Server.app;
const database = Server.database;
const rpc = Server.rpc;

export { webinterface, app, database, rpc };
import webinterface from "./lib/engine/WebInterface.mjs";
import Server from './lib/engine/Server.mjs';


await Server.setServerConfig();
await Server.registerCertificate();
await Server.setFastify();
await Server.printLogo();
await Server.registerPlugins();
await Server.setContentTypeParser();
await Server.initializeServer();


export const { app, database, rpc } = Server;
export { webinterface };

await Server.initializeMods();

import webinterface from "./lib/engine/WebInterface.mjs";
import Server from './lib/engine/Server.mjs';
import { checkForUpdates } from "./lib/ext/update.mjs";

await checkForUpdates();
export async function startServer() {
    await Promise.allSettled([
      Server.setServerConfig(),
      Server.registerCertificate(),
      Server.setFastify(),
      Server.printLogo(),
      Server.registerPlugins(),
      Server.setContentTypeParser(),
      Server.initializeServer(),
    ]);
  }
  const app = Server.app;
  const database = Server.database;
  const rpc = Server.rpc;

  export { webinterface, app, database, rpc };

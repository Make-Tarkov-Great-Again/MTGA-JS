const { certificate } = require("./lib/engine/CertificateGenerator");
const zlib = require("node:zlib");
const open = require("open");

/**
 * Fastify instance
 */

const database = require('./lib/engine/Database');
const webinterface = require("./lib/engine/WebInterface");

module.exports = {
    database
};

const { DatabaseLoader } = require("./lib/engine/DatabaseLoader");
const { logger } = require("./utilities");

DatabaseLoader.loadDatabase();

const cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname);
if (process.platform === 'win32' || process.platform === 'win64') {
    const fs = require('fs');
    const powerShellPath = `${__dirname}/scripts/install-certificate.ps1`;
    const powerShellScript = fs.readFileSync(powerShellPath);
    let spawn = require('child_process').spawn;
    let powerShell = spawn('powershell', [powerShellScript]);

    let userCancelOrError = false;

    // Redirect stdout and stderr to our script output.
    let scriptOutput = "";
    powerShell.stdout.setEncoding('utf8');
    powerShell.stdout.on('data', function (data) {
        data = data.toString();
        scriptOutput += data;
    });

    powerShell.stderr.setEncoding('utf8');
    powerShell.stderr.on('data', function (data) {
        data = data.toString();
        scriptOutput += data;
        userCancelOrError = true;
    });

    powerShell.on('close', function (_code) {
        if(userCancelOrError) {
            logger.logError(`Unable to install the certificate. Error occured or user canceled the installation.`)
            logger.logError(`The certificate is required for Websockets to work, otherwise the tarkov client will not connect to the socket endpoint.`)
            logger.logError(`If you have any security concerns, you can take a look at the script ${powerShellPath}. The certificate lifetime is 3 days.`)
            logger.logError(`The certificate is generated on first start and will be saved to /user/certs/.`)
            logger.logConsole(`                                                                                                    
                                                                           
                               .    :. .                                   
                               .7:  :BPP~....  ..^?^:.:                    
                               .J^  ?B?.         ^&GJ:..                   
                              :?!.:~~.     ..    .&@?:~~^^~:^::.           
                              ~:5~:.J?    .BG    .#Y!!:~^.?.               
                              :!~~~ ~7  :: ..   .G!~7Y?P^J^                
                          .^:..~GG?::7^:JY~.    B#.:.J~!~:..               
                              ^G5Y?!7?Y?5G&&#G7:G5J ^~~  :::..             
                             :7!:5#&@@@@B?^:.!JBGY: :^~                    
         ...:^:...  .        !J^ :~~!!~^..:~7PG#&B!5PG7:^::.7P57           
 .^~~^^^^::!.^?J~~J. :^^:^~7!G&@BBPJ!77?55#B&P@@@B?!. !     .:^YB:....     
!?^:.:^~~^~!^P~&P?5P!!~P@@@&&&P5B&&B&&GG&B&G&#@#?   JY.         .J7P@&B#&#J
    .!:.. .J~JG&&5Y&JG&#7..      !???J?~?5P5P5^     .^~. :        ~&&@@&#&&
    ^...~!~5G5G!@&P5@@&  ^^.  .^:      ::.. .^  .~:5@&? .~   ?     :?.~@@&B
    ....^Y~~JG55YB5J@@: .&&&BJ!!   : ..^    :::YGG@@BY^..   B&      ~^~&@#&
     ...!:G:P&J?7:!G@:  :Y&@#5BG^.:!. .       :#!!#B75Y 7Y J@@~      !^~BB5
   ::~J ~~Y7GPPGYY7@5  :B. !PY~    .  :      .:?PG5J&J.  : J@@@B.     :!!.7
  .!~^:! J7#B#&&#GP@^  ~&!..^.^!7Y^. .:!:   7!. .:        ~&&@@&~       ^~?
 .:.!5.7:75BGG&@@PB#   !G&@#G#&5:.  ~~BY:?   :5PJGY5P55Y5#&@@@@@#Y.       :
.:^:.57:^#BB5#&@&&&.  :P&@P~~^.    :J!Y@PP     ~^~J?7!Y?5?G?B@@@@&&7       
::^:^.Y?#BP#B#@@@@!   ^B@B:        ?J.!@@7           .7:G?5YB@@@@@B7J!^    
^~^~^J#&Y?PGJP@&@&^   P&&!         B7 &?5               ^P&PB#@@@@@@G.757  
 ?!G@#J7JPY^5@@#7.^77Y&&.       :^^B:?&!B^?PJ7!.          J#&@&@@@@@@5 .!^ 
!B#&&7^^J?PGG7:.   ~?B#~   :.^JGP?!P.^!~#.^77J5Y!:.         7B##@@@@&###G??
B#G#JPBBY?^        ^.@P           .P ^:7@!::..              .~Y^&@&&&@@@@#P
B5P##Y^...    ^~??Y7B@:    ..  .P#B5^J.?@B#&@&BB57~:.       ^J: P@@@@@@&#&#
5!.       ^^YB&@@&&#@@#JPGGGGJJ?J!:5!P?G& .:^!^^~7G55!!^^    ~ :B@@@@@&@@@@
     :JGB&@@&###P5#&G??55: ... .~5Y&.PJP@.. . .  .::^.~^~!~?BPB@BBBBB@@@@@&
   ^G@@@#P7^.:~:...      .:!575?&&G5Y@@#@G   .^^YP5BJJJ7^.^7!YYJPB#@&J&@&#G
 :Y&&&~                      5&&G: .!5^.?&#7PJ&&~.             :!:~Y#&@@@&&
^BGP!.  .:^:::..       . ..!~~#@. .J^ ~J7?@@@&P!                 ..  ?7YG#@
J^..       .^ ..         ..?7:B@~:!77BGPB@@J!G!   ..   :            !!.. ^Y
Y~ .       ...   .   :^!?GG??B@@@&#B&&@@@&?^PG7^~.. .:^.    ^:..     :..   
^ :: .  .         :.~5#?Y5~J@@@@@@&B&#BBG5J77Y^7J^.J7:.     :           .. 
.. .              :~~^?PB?YJP@@@@@&&#!7!#G^^7:~77^:! .         .  ..       
 ~7    ..:?Y.    ^ .^5#5P&#BG@@@&@@&@&BP@&JY7^^~!^:^^!.. . . !Y... ^  .  . 
J!        ~.!JY7!~7YPB5Y&&&@@@&##@@@@&P&@#BJ~^~!7??!PYY:!~^~~.5?.7!PJ.5:.  
:         .?5!J^!?PY5BB&&&@@@@@@&@#~.?B@@@7.~~^^:^!PB55^~5??P~.YJ.7!B^.7   



                            See ya retard!!!!!!
                        
                        
                        
                        `)
            //logger.logDebug(scriptOutput);
        } else {
            //open(`https://${database.core.serverConfig.ip}:${database.core.serverConfig.port}`) Opens the weblauncher automatically if wanted.
        }
    });
}

const app = require('fastify')({
    logger: {
        transport: {
            target: 'pino-pretty'
        },
        serializers: {
            res(reply) {
                return {
                    statusCode: reply.statusCode
                };
            },
            req(request) {
                return {
                    method: request.method,
                    url: request.url,
                    headers: request.headers,
                    params: request.params,
                    body: request.body,
                    query: request.query,
                    hostname: request.hostname,
                    remoteAddress: request.ip,
                    remotePort: request.socket.remotePort,
                    routerMethod: request.routerMethod,
                    routerPath: request.routerPath
                };
            }
        }
    },
    //http2: true,
    https: {
        allowHTTP1: true,
        key: cert.key,
        cert: cert.cert
    }
});

module.exports = {
    app,
    database,
    webinterface
};

app.removeContentTypeParser("application/json");
app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (req, body, done) {
    if (typeof req.headers['user-agent'].includes('Unity') !== 'undefined') {
        try {
            zlib.inflate(body, function (err, data) {
                if (!err && data !== undefined) {
                    const inflatedString = data.toString('utf-8');
                    if (inflatedString.length > 0) {
                        const json = JSON.parse(inflatedString);
                        done(null, json);
                        return;
                    }
                    done(null, false);
                    return;
                } else {
                    done(null, false);
                    return;
                }
            });
        } catch (error) {
            err.statusCode = 400;
            done(err, undefined);
            return;
        }
    } else {
        try {
            const json = JSON.parse(body);
            done(null, json);
        } catch (err) {
            err.statusCode = 400;
            done(err, undefined);
        }
    }
});

app.addContentTypeParser('*', (req, payload, done) => {
    const chunks = [];
    payload.on('data', chunk => {
        chunks.push(chunk);
    });
    payload.on('end', () => {
        done(null, Buffer.concat(chunks));
    });
});

/**
* Register Handler
*/

app.server.on("upgrade", function (request, socket, head) {
    logger.logInfo("upgrade");
});

app.server.on("error", function (error) {
    logger.logError(error);
});

app.server.on("listening", function (){
    logger.logConsole(``);
    logger.logConsole(``);
    logger.logConsole(`     █▀▄▀█    ▄▄▄▄▀   ▄▀  ██   `);
    logger.logConsole(`     █ █ █ ▀▀▀ █    ▄▀    █ █  `);
    logger.logConsole(`     █ ▄ █     █    █ ▀▄  █▄▄█ `);
    logger.logConsole(`     █   █    █     █   █ █  █ `);
    logger.logConsole(`        █    ▀       ███     █ `);
    logger.logConsole(`       ▀                    █  `);
    logger.logConsole(`                           ▀`);
    logger.logConsole(`     Make Tarkov Great Again`);
    logger.logConsole(``);
});

app.register(require('./plugins/register.js'));

app.listen({ port: database.core.serverConfig.port, host: database.core.serverConfig.ip });


const { certificate } = require("./engine/certificategenerator");
const WebSocket = require("ws");
const zlib = require("node:zlib");
const crypto = require("crypto")
const open = require("open");

/**
 * Fastify instance
 */

const database = require('./engine/database');
const webinterface = require("./engine/webinterface");

module.exports = {
    database
};

const { DatabaseLoader } = require("./engine/databaseLoader");
const { logger } = require("./plugins/utilities");

DatabaseLoader.loadDatabase();

const cert = certificate.generate(database.core.serverConfig.ip, database.core.serverConfig.hostname);
if (process.platform === 'win32' || process.platform === 'win64') {
    const fs = require('fs');
    const powerShellPath = `${__dirname}/scripts/install-certificate.ps1`
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
                                                                                                    
                                                                                                    
                                                                                                    
                                                ..                                                  
                                         .?~    :P~~YY..:::::..... .                                
                                           J?   .Y&#Y^.         .:5B?Y!~!                           
                                          ^P^.  7&P~.      ...   .!&GP:. ...                        
                                        :!B ..~7:.         ....   7@@P~:^!^.^~ .^~~^^               
                                       .7 ~G~ ! YB.      7PJ      .@&J!!!:Y?:?5^.                   
                                        ^J^JJ.7 ~J:   .  JB5.     GP!!!^:~~  ~.                     
                                        .7^!~^: 7?^   7:        :?&:~?JP?GY7P?..                    
                                   .~~^::.:PGY~.^!P~:J!?:       5@! ^..J!?!^.::.                    
                                         7&&BJ~:. :..~BG##??~.  B@G^.^!P^ .^!.                      
                                       .!G?~75?5G&B&GGGYB#&&&BP7P7Y?  ^.?    :^~^:                  
                                       ~!7^^G#&@@@@@@&G?:.  :~PG&JP  .^:!                           
                .::....               :7J!  :^7??J?7^....^.^YJP#&&?:7YP&?:^^:.  ^JJ!:               
      ...:~~^:.?:.~!^.~?~...^.         ?Y&G?7?!^..::^!^~?5G&Y@#&@&BB#G~:?  ..:^^755B@G~             
.:~5?7~^^:^:.^~!.?:5G5~^P!  .!7JY755#GB&@@&#&#GG5JBJG5&B@&G&?@@@@&!.    ?.          .?B^^^^^~...:::.
!Y?.....^!!!^^^!^JG:##JY5GG7?^^P@@@@@&@&PPY&@#&#@#@JP@&P&BG@G@@BJ.   ~&G.             :P7~@@@&#@@@#?
.     ~!:::...~!~ BJ&@BJ7B#:?B&@B?^^ ..    .JY#!Y&5B?P7P5#G&BG^       .  .              7&@@@@@&BG#&
     .~^.   ..!B55GPJ@#BBG&&@@@:          ...  !:.   :7??~::~        ~5BPJ ~B:    .      :#!GG5&@@@&
     :. ..:YY!7?G?#B.#@&P!B@@@!  J?J^  .:^?.        !^     .~. ^^?Y!&@@&~        Y5       ^J  P@&&BB
     ::.. .:5J.!57#JG5J&GJG&@J   #&#@&GY7?.    ^  :.~      ~:.7Y#BB@@@YY~::.    G@?        ?7.G&@&#&
     .   .^!.#~~YB#!JJ.:J^&@Y    Y#@@&&!?&7^.~ ?. ..          5G~:5&&:^?G..Y?  5@@#.        5^ P&#BP
      !~J :Y:?P.Y&J5??Y!^J@G    YY YBGP#&5^: .:^   ^         .^@BJ5GP&@5J  ^G? 5@@@?^:       !J ?G77
    J !.5^ ^J.B7BGPB#BJP?#@^   !&^  .Y5~           ~        ::::!B5J!7#^       B@@@@@!        :Y!  P
   :~?.! 5  5!J&BG&&B&PBY@@.   J@G.. .  :^!7B?^:  ..7!    .P!.   ^            P&&&@@&7:         ^J77
  .^..G? 7J !JY&5#G&@@@J7@?    ^B#&&&##&@@G7^   ~?^#Y:Y:   .7PBJ!GY~^!!!!???G&@@@@@@@&G7          .7
  !.~.7G~^:!YGGBBY&@@@#G&@    !GP&@@Y!PYY:     .~~?@&: #.     ?5?Y5B#&G##YY5PY5B@@@@@&BG5:          
 ! 7 7 5P:.^@G&#JB&&@@#@&.    ?5&@@^^~..       ~G?:?@@&J       :^.7~^:^:77YG!P#:P&@@@@@@@B^         
^.!:^^::Y~5&#PB#G#&@@@@@J     Y#@BB .          P?^ 7@@@!.              :5^~B?7GYG@@@@@@@B!^GJ~.     
:~.!!.!.G@&Y?J5#BJ#@&&@&^    :BB@JJ            BY .@7@~               .    YP&YY&#&@@@@@@@@? 7#Y~.  
 Y^.~?P&G5PJYBG7~P@@&&&J?.  ^G&@B^            .@7 P@.#.                     :#@BGB#@@@@@@&&&?. 7Y:  
 :5J&@@Y?7!YGY~^5@@@B~  .7B5JG@P         .:!7!YB^:&G.@PJG@&BGG?.              JB&@&@&@@@@&@@B . :J~ 
^Y##&@G7~ ~7~PB&#5^.^  .  JJBGB^    :..7PB&B5!5Y. P^.@~:^!??JGBG?^.             ~&P&B@@@@@&&&#&&B?~J
#&@G#?!~!B#B5Y:..      . .^ &@7     .:.       !5  ~^:@J         ...              ^JG!B@@&&#&&@@@@&B5
GJ!5@##@&G~:~:.    :   : 7.Y@#              ..P5.:Y :@@B#BBGPJ!:                ^Y^7.^@@&&@@@@@@@#PP
&BBGGGY^         :.??YPYPG?@@P      :^.  .?@@@BY~!G ~@@YP#&@&B&&&B5?7~:...      .!?. !#@@@@@@@@#G@&&
BJ^.          ^.!#G@@&@&@5&@@&P~YBB&&#BP5YYY7:!5~GB75@7  .:^7~^~:~5#PBJ???~?     .~  7&@@@@@@#&@@@@@
         ^!!J#&@@@&&&&&G&@@@&&&&@5~...:.::..^ Y# ?P^7@J .. .  : ...^.^: :      .7!!!@&@&&@GB@@@@@@@@
     .JB&@@@@@&&PJYB5!!!55!.   ..   ^^~^. .#@&@@^~@BG@&    . :.  .:~JJ.?PGBP555&@&&@&GPB?PB&&#@@&&##
    ^P@@@&&P?^.   ....           .^^~P5~&GB@&G~7P&@&B#@G. :  :!!#&BPGP??!:.   :. ^7^~YPB&@@&!P@&&&BP
 .:5&&@@7.                             B&P@P:  .!PB. ^Y@BY:G!G@&~.                  .J^.^5B@@@@@@@&#
.!B&&BY^                      .^ ...!^~P@@#.  :J:  .7P~J@@&@&@#P                    . :^.  .5PG#B&@@
7#P~~.     .^~~^~!^!!               ^?..!@P : ?J7:J?Y^~#@@@GGJ                          .::.?^.^?5G&
?. ..          .~                ^:.YJ?^&@@:^:?^!G&GG&@@@5 7PG:    :^    .!                J~...  ~J
P?:  .         ....         ::.!?5G#J~!&@@@@&#B&&#@@@@@&P !BPP7:!.:.  .:~^     .^!..       .~^:.    
!! :~     ..           ^:   7##!7BP7~#&@@@@@@@&G@&@@&B&Y^G57&.~~?~  ~PJ^.       ~:..^:          ..  
.  :. .                 .!JGYPP7GJ~^5&@@@@@@&@G&&JP7PYBJP:.Y7.J??P ^J~ ..      .                 .^.
:^. .       ..         .^^:..~?GBG?BJ:&@@@@&@@&&&J!J.##G:.Y^~.?!~? ~^^ :            ~   .^:         
  ~?.     ..!~G5^     .^  .:YG&Y5B&BGPB@@@@&@@@#@#&#J#@&J7Y~!.~^~7 ~:! !.   .    ~~5. :   ^       . 
.5Y          :J^..!?!^^^~JJG#@57B@&B@@@@@&GB&@@@@@#P&@@BP#5^~:Y~J?^?.?5YY:~:~: Y. 5P~ ~J^5P: Y!.::  
B^           .: 5BPJ!7!!?JGJPY?#@&&@&@@&B@&&@@@&GBB5B@&&G!:~~^:~^Y^GJPP?B^^J!!?.5. Y5J ~J^#G..G     
.       .     ~G5:!Y~^7?BP7G##&@&@@@@@&@@@&&@&7  :J#@@@@Y ^~~~~^^.~^P#PGJY.^P5!P5P. YYY !?!BJ ~J    



                        See ya retard!!!!!!`)
            logger.logDebug(scriptOutput);
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
    if (req.headers['user-agent'].includes('Unity')) {
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
    logger.logInfo("upgrade")
})

app.server.on("error", function (error) {
    logger.logError(error)
})

app.register(require('./plugins/register.js'));                                              
app.listen({ port: database.core.serverConfig.port, host: database.core.serverConfig.ip });
logger.logConsole(`

█▀▄▀█    ▄▄▄▄▀   ▄▀  ██   
█ █ █ ▀▀▀ █    ▄▀    █ █  
█ ▄ █     █    █ ▀▄  █▄▄█ 
█   █    █     █   █ █  █ 
   █    ▀       ███     █ 
  ▀                    █  
                      ▀`)
logger.logConsole(` Make Tarkov Great Again
`)

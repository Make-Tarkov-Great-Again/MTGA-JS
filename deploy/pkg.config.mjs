import exe from '@angablue/exe'

const build = exe({
    entry: './deploy/dist/MTGA.js',
    out: './deploy/dist/MTGA-Server.exe',
    pkg: ['-C', 'Brotli'],
    target: 'latest-win-x64',
    icon: './assets/templates/webinterface/resources/favicon.ico',
    properties: {
        FileDescription: 'Make Tarkov Great Again',
        ProductName: 'Make Tarkov Great Again',
    }
});

build.then(() => console.log('Build completed!'));
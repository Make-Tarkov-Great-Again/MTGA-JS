import path from 'path';
import url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
    entry: './app.mjs',
    mode: 'production',
    output: {
        filename: 'mtga.js',
        path: path.resolve(__dirname, 'dist'),
    },
    experiments: {
        topLevelAwait: true,
    },
    target: 'node',
    externals: ['bufferutil', 'utf-8-validate'],
};
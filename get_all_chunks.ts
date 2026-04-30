import axios from 'axios';
import fs from 'fs';

const chunks = [
    'ce8211af128650a2',
    '9e4c75234a56415e',
    '4f3d88aace9b312a',
    '8cbae43942e440ba',
    'turbopack-669887fa78212a42',
    'a1ddb43309d332f8',
    '8a07e07106d6caa4',
    'f9baf9683436d3c5',
    '82b3fdfb23b8e36c',
    'd97a77cb93d7ec3a',
    '6e3785f900fd059e',
    '2fa83d8c1569c0ed',
    'dfefb376b9dd700a'
];

async function downloadAll() {
    for (const chunk of chunks) {
        const url = `https://www.adkhospital.mv/_next/static/chunks/${chunk}.js`;
        console.log(`Downloading ${chunk}...`);
        try {
            const resp = await axios.get(url, { timeout: 10000 });
            fs.writeFileSync(`${chunk}.js`, resp.data);
        } catch (e: any) {
            console.error(`Error ${chunk}:`, e.message);
        }
    }
}

downloadAll();

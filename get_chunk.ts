import axios from 'axios';
import fs from 'fs';

async function downloadChunk() {
    const url = 'https://www.adkhospital.mv/_next/static/chunks/dfefb376b9dd700a.js';
    console.log(`Downloading ${url}...`);
    try {
        const resp = await axios.get(url);
        fs.writeFileSync('chunk.js', resp.data);
        console.log('Saved chunk.js');
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

downloadChunk();

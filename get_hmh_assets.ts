import axios from 'axios';
import fs from 'fs';

async function getAssets() {
    const assets = [
        'https://hmh.gov.mv/assets/entry.client-RPBzBgNC.js',
        'https://hmh.gov.mv/assets/root-Bi_5GZGv.js'
    ];
    for (const a of assets) {
        const name = a.split('/').pop();
        console.log(`Downloading ${a}...`);
        try {
            const resp = await axios.get(a);
            fs.writeFileSync(name!, resp.data);
        } catch (e: any) {
            console.error(`Error ${a}:`, e.message);
        }
    }
}
getAssets();

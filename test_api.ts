import axios from 'axios';

const endpoints = [
    'https://www.adkhospital.mv/api/tokens',
    'https://www.adkhospital.mv/api/queue',
    'https://www.adkhospital.mv/api/token-status',
    'https://www.adkhospital.mv/api/v1/tokens',
    'https://www.adkhospital.mv/api/v1/queue'
];

async function testEndpoints() {
    for (const url of endpoints) {
        console.log(`Checking ${url}...`);
        try {
            const resp = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                },
                timeout: 5000
            });
            console.log(`SUCCESS [${resp.status}]:`, url);
            console.log(JSON.stringify(resp.data).substring(0, 200));
        } catch (e: any) {
            console.log(`FAILED [${e.response?.status || e.message}]:`, url);
        }
    }
}

testEndpoints();

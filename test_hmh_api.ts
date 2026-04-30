import axios from 'axios';

async function testHMHApi() {
    const endpoints = [
        'https://hmh.gov.mv/queue?_data=routes%2F_public.queue',
        'https://hmh.gov.mv/queue?_data=root',
        'https://hmh.gov.mv/queue?_data=routes%2Fqueue',
        'https://hmh.gov.mv/api/queues'
    ];

    for (const url of endpoints) {
        console.log(`Checking ${url}...`);
        try {
            const resp = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept': 'application/json'
                },
                timeout: 10000
            });
            console.log(`SUCCESS [${resp.status}]:`, url);
            console.log(JSON.stringify(resp.data).substring(0, 500));
        } catch (e: any) {
            console.log(`FAILED [${e.response?.status || e.message}]:`, url);
        }
    }
}

testHMHApi();

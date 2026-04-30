import axios from 'axios';
import fs from 'fs';
import * as cheerio from 'cheerio';

async function testHMH() {
  const url = 'https://hmh.gov.mv/queue';
  console.log(`--- Fetching ${url} ---`);
  try {
    const resp = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      },
      timeout: 30000
    });
    console.log('Status:', resp.status);
    console.log('Length:', resp.data.length);
    
    // Save to file for manual inspection if needed
    fs.writeFileSync('hmh_live.html', resp.data);
    
    const $ = cheerio.load(resp.data);
    
    // 1. Check for stream segments
    const allEnqueues = resp.data.match(/enqueue\("(.+?)"\)/g) || [];
    console.log(`Found ${allEnqueues.length} enqueue segments`);
    
    allEnqueues.forEach((e, i) => {
        if (e.includes('queue') || e.includes('token') || e.includes('ROOM')) {
            console.log(`Segment ${i} (partial): ${e.substring(0, 100)}...`);
        }
    });

    // 2. Check for visible text patterns
    const text = $('body').text().replace(/\s+/g, ' ');
    console.log('Body Text snippet:', text.substring(0, 500));
    
    const roomMatches = text.match(/(ROOM|GP ROOM|GOPD ROOM|MH ROOM|PSY ROOM|CDC ROOM|GP|GOPD|MH|PSY|CDC)\s+([A-Z0-9\s-]{1,15})\s+([A-Z0-9]{1,4})/gi);
    console.log('Potential Room Matches:', roomMatches);

  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

testHMH();

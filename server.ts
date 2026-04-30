import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // HMH Data Scraper
  app.get('/api/hmh/queues', async (req, res) => {
    try {
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5IiwianRpIjoiYzUwMDUwZWM2ZTI0OWRiMDUwZjhjOTU3YmU2YWJjMTJhMDQ5OWUwYjJiYzEyYzkyOTNlZGIxNWE1MmZkMTY4ZWExYmE4N2E0NjNlZTQxYmQiLCJpYXQiOjE3NjgyMzAzMTkuNDI1MTA4LCJuYmYiOjE3NjgyMzAzMTkuNDI1MTEzLCJleHAiOjE3OTk3NjYzMTkuNDA5Miwic3ViIjoiIiwic2NvcGVzIjpbXX0.rvD_FtiWl4a9QWdempukZMq36Q_28tDqUkN8Rj2W-Nxzu_9pv37QWrZXhgtpYyd29yE-ij1lE6QEOMqUK0Yu7M9lYwCr6x-MK5ieRCop6dIGlKDla3PrE11mpFvrv768dcmfmAP449eTVr_lvqvWoRHiKMSCr_k9VnvocrKHCbpK-YtycpUpZ7n6aIynE8JIIIa7iYlXMAiRy3bs49VplHM8kmwk0hSZhgYslRo9fFk24UjoSbTLJeaNXAfmzEtCsTezQXWByrI9Om3VIvQeO1gJHya7kT2SSQJ-VfZyVT5IPtrgJL6HOp_qTgHt8Ozlvz-F4nyaf9TQQNsYy3TqKynK_b-lksdDbedQQLTo534v4PS1ZVpK2dAb7Zye-1TWfjgUqXgHahN_sAFarnac2mHGo7c1G8h7aLap5OXAnLLrukqLytLR0eg4Mg49rPrz7FdzN8OT8b5_Wl2nW_-J-ETcCzYar0Z_-w-fmWYjZJnx-C6Gm8w1P2V60cj42fG4YG_bRyLkw2MXy24mfO_64eM_0uM0fPbePIhiio7h47T0xRI19fYwZYDPayfyjA-EcdyiX9JHwrC5pRn8WME8uvIqGnUH99LM2MpJyy2PSOBWhJKsKV8HYVCtvCjFDCnFo1-SY4ppBbHroJXzcIRqndti7xjVylc6uUL-5RLNAm4';
      const url = 'https://api.hmh.gov.mv/api/queue/0';
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        const queues = response.data.data.map((item: any) => ({
          id: `hmh-${item.RoomID}`,
          name: item.RoomLabel,
          prefix: '',
          currentNumber: item.TokenNo,
          counterInfo: item.Pq === "1" ? 'Priority' : 'Live',
          lastUpdated: new Date(item.CalledOn)
        }));
        return res.json(queues);
      }

      res.json([]);
    } catch (error) {
      console.error('HMH API Error:', error);
      res.status(500).json({ error: 'Failed to fetch HMH queue' });
    }
  });

  // Vital Care Data Scraper
  app.get('/api/vitalcare/tokens', async (req, res) => {
    try {
      // Vital Care uses a .NET AJAX call
      const response = await axios.post('https://token.vitalcare.com.mv/index.aspx/GetTokenData', {}, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });
      
      const rawData = response.data.d; // This is an array of objects
      if (!rawData || !Array.isArray(rawData)) return res.json([]);

      const queues = rawData.map((item: any, i: number) => ({
        id: `vc-${i}`,
        name: item.DocName || 'Consultation',
        prefix: '',
        currentNumber: item.TokenNumber === 0 ? 'CLOSED' : item.TokenNumber.toString(),
        counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
        lastUpdated: new Date()
      }));

      res.json(queues);
    } catch (error) {
       console.error('Vital Care AJAX Error:', error);
       res.status(500).json({ error: 'Failed to fetch Vital Care' });
    }
  });

  // ADK Hospital Data Scraper
  app.get('/api/adk/queues', async (req, res) => {
    try {
      const [serviceResp, roomResp] = await Promise.all([
        axios.get('https://www.adkhospital.mv/api/token-queues', { timeout: 10000 }),
        axios.get('https://www.adkhospital.mv/api/token-rooms', { timeout: 10000 })
      ]);

      const queues: any[] = [];

      // Process Service Queues
      if (serviceResp.data && Array.isArray(serviceResp.data.queues)) {
        serviceResp.data.queues.forEach((q: any) => {
           if (q.currentattend) {
             queues.push({
               id: `adk-s-${q.serviceid}`,
               name: q.servicename.split(':')[0].trim(), // Clean up name
               prefix: '',
               currentNumber: q.currentattend,
               counterInfo: 'Service',
               lastUpdated: new Date()
             });
           }
        });
      }

      // Process Room/Consultation Queues
      if (roomResp.data && Array.isArray(roomResp.data.rooms)) {
        roomResp.data.rooms.forEach((r: any) => {
          if (r.token && r.token !== '-') {
            queues.push({
              id: `adk-r-${r.id}`,
              name: r.doctorName || r.department || `Room ${r.room}`,
              prefix: '',
              currentNumber: r.token,
              counterInfo: `${r.department ? r.department + ' - ' : ''}Room ${r.room}`,
              lastUpdated: new Date(r.lastUpdated || new Date())
            });
          }
        });
      }

      res.json(queues);
    } catch (error) {
      console.error('ADK Scrape Error:', error);
      res.status(500).json({ error: 'Failed to fetch ADK queues' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

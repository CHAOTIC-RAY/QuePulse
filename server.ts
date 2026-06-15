import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

const QUEUEBEE = {
  base: 'https://q04-mv.qbe.ee',
  configPath: '/config/igmh/server.json',
  defaultBranch: 'toKrLsBreyiInmDONtYdZw==',
  branchMatchers: {
    igmh: (name: string) => /\bigmh\b/i.test(name) && !/vill?imale|dharumavantha/i.test(name),
    vilimale: (name: string) => /vill?imale/i.test(name),
    dharumavantha: (name: string) => /dharumavantha/i.test(name),
  } as Record<string, (name: string) => boolean>,
};

let queuebeeCreds: { client_id: string; country_code: string } | null = null;
let queuebeeCredsAt = 0;
let branchCache: Record<string, string> | null = null;
let branchCacheAt = 0;

function reqUid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function isActiveToken(token: unknown) {
  if (!token) return false;
  const t = String(token).trim().toUpperCase();
  return t !== '' && t !== '-' && t !== 'N/A' && t !== 'CLOSED' && t !== '0';
}

async function getQueueBeeCreds() {
  if (queuebeeCreds && Date.now() - queuebeeCredsAt < 3600000) return queuebeeCreds;
  const resp = await fetch(`${QUEUEBEE.base}${QUEUEBEE.configPath}`, { headers: SCRAPE_HEADERS });
  const data = await resp.json();
  queuebeeCreds = { client_id: data.server.client, country_code: data.server.country };
  queuebeeCredsAt = Date.now();
  return queuebeeCreds;
}

async function queuebeePost(path: string, creds: { client_id: string; country_code: string }, extra: Record<string, string> = {}) {
  const body = new FormData();
  body.append('req_uid', reqUid());
  body.append('country_code', creds.country_code);
  body.append('client_id', creds.client_id);
  body.append('branch_id', QUEUEBEE.defaultBranch);
  for (const [k, v] of Object.entries(extra)) body.append(k, v);
  const resp = await fetch(`${QUEUEBEE.base}${path}`, { method: 'POST', headers: SCRAPE_HEADERS, body });
  return resp.json();
}

async function resolveBranchMap() {
  if (branchCache && Date.now() - branchCacheAt < 1800000) return branchCache;
  const creds = await getQueueBeeCreds();
  const data = await queuebeePost('/api_qapp/listbranch', creds);
  const map: Record<string, string> = {};
  if (data.status === 200 && Array.isArray(data.data)) {
    for (const [key, matcher] of Object.entries(QUEUEBEE.branchMatchers)) {
      const branch = data.data.find((b: { name?: string; mid?: string }) => matcher(b.name || ''));
      if (branch?.mid) map[key] = branch.mid;
    }
  }
  branchCache = map;
  branchCacheAt = Date.now();
  return map;
}

async function scrapeQueueBeeBranch(hospital: string, prefix: string) {
  const creds = await getQueueBeeCreds();
  const branches = await resolveBranchMap();
  const branchId = branches[hospital];
  if (!branchId) throw new Error(`Branch not found for ${hospital}`);

  const data = await queuebeePost('/api_qapp/listservice', creds, { branch_id: branchId });
  if (data.status !== 200 || !Array.isArray(data.data)) {
    throw new Error(data.message || `QueueBee scrape failed for ${hospital}`);
  }

  const queues: any[] = [];
  for (const dept of data.data) {
    for (const svc of dept.dept_service_data || []) {
      const token = svc.serv_current_serving;
      if (!isActiveToken(token)) continue;
      const isRoom = /room/i.test(svc.serv_label || svc.serv_name || '');
      queues.push({
        id: `${prefix}-${svc.serv_id}`,
        name: svc.serv_label || svc.serv_name,
        prefix: '',
        currentNumber: String(token),
        counterInfo: isRoom ? `Room · ${dept.dept_label || 'Live'}` : dept.dept_label || 'Live',
        lastUpdated: new Date(),
      });
    }
  }
  return queues.sort((a, b) => a.name.localeCompare(b.name));
}

async function scrapeHMH() {
  const [deptResp, labResp] = await Promise.all([
    fetch('https://hmh.gov.mv/api/queue/dept/0', { headers: SCRAPE_HEADERS }),
    fetch('https://hmh.gov.mv/api/queue/lab', { headers: SCRAPE_HEADERS }),
  ]);

  const queues: any[] = [];
  const deptData = await deptResp.json();
  if (deptData?.success && Array.isArray(deptData.data)) {
    for (const item of deptData.data) {
      queues.push({
        id: `hmh-${item.RoomID}`,
        name: item.RoomLabel,
        prefix: '',
        currentNumber: item.TokenNo,
        counterInfo: item.Pq === '1' ? 'Priority' : 'Live',
        lastUpdated: new Date(item.CalledOn),
      });
    }
  }

  const labData = await labResp.json();
  if (Array.isArray(labData?.queues)) {
    for (const item of labData.queues) {
      if (!item.currentToken && !item.TokenNo) continue;
      queues.push({
        id: `hmh-lab-${item.RoomID || item.id || item.RoomLabel}`,
        name: item.RoomLabel || item.name || 'Lab Service',
        prefix: '',
        currentNumber: String(item.currentToken || item.TokenNo),
        counterInfo: 'Services',
        lastUpdated: new Date(),
      });
    }
  }
  return queues;
}

async function scrapeADK() {
  const [serviceResp, roomResp] = await Promise.all([
    fetch('https://www.adkhospital.mv/api/token-queues', { headers: SCRAPE_HEADERS }),
    fetch('https://www.adkhospital.mv/api/token-rooms', { headers: SCRAPE_HEADERS }),
  ]);

  const serviceData = await serviceResp.json();
  const roomData = await roomResp.json();
  const queues: any[] = [];

  if (Array.isArray(serviceData?.queues)) {
    for (const q of serviceData.queues) {
      if (!q.currentattend) continue;
      queues.push({
        id: `adk-s-${q.serviceid}`,
        name: q.servicename.split(':')[0].trim(),
        prefix: '',
        currentNumber: q.currentattend,
        counterInfo: 'Service',
        lastUpdated: new Date(),
      });
    }
  }

  if (Array.isArray(roomData?.rooms)) {
    for (const r of roomData.rooms) {
      if (!r.token || r.token === '-') continue;
      queues.push({
        id: `adk-r-${r.id}`,
        name: r.doctorName || r.department || `Room ${r.room}`,
        prefix: '',
        currentNumber: r.token,
        counterInfo: `${r.department ? r.department + ' - ' : ''}Room ${r.room}`,
        lastUpdated: new Date(r.lastUpdated || Date.now()),
      });
    }
  }
  return queues;
}

async function scrapeVitalCare() {
  const resp = await fetch('https://token.vitalcare.com.mv/index.aspx/GetTokenData', {
    method: 'POST',
    headers: {
      ...SCRAPE_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({}),
  });

  const data = await resp.json();
  if (!Array.isArray(data.d)) return [];

  return data.d
    .filter((item: any) => item.TokenNumber !== 0)
    .map((item: any, i: number) => ({
      id: `vc-${i}`,
      name: item.DocName || 'Consultation',
      prefix: '',
      currentNumber: String(item.TokenNumber),
      counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
      lastUpdated: new Date(),
    }));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get('/api/hmh/queues', async (_req, res) => {
    try {
      res.json(await scrapeHMH());
    } catch (error) {
      console.error('HMH scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape HMH queues' });
    }
  });

  app.get('/api/vitalcare/tokens', async (_req, res) => {
    try {
      res.json(await scrapeVitalCare());
    } catch (error) {
      console.error('VitalCare scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape Vital Care' });
    }
  });

  app.get('/api/adk/queues', async (_req, res) => {
    try {
      res.json(await scrapeADK());
    } catch (error) {
      console.error('ADK scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape ADK queues' });
    }
  });

  app.get('/api/igmh/queues', async (_req, res) => {
    try {
      res.json(await scrapeQueueBeeBranch('igmh', 'igmh'));
    } catch (error) {
      console.error('IGMH scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape IGMH queues' });
    }
  });

  app.get('/api/vilimale/queues', async (_req, res) => {
    try {
      res.json(await scrapeQueueBeeBranch('vilimale', 'vilimale'));
    } catch (error) {
      console.error('Vilimale scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape Vilimale queues' });
    }
  });

  app.get('/api/dharumavantha/queues', async (_req, res) => {
    try {
      res.json(await scrapeQueueBeeBranch('dharumavantha', 'dharumavantha'));
    } catch (error) {
      console.error('Dharumavantha scrape error:', error);
      res.status(500).json({ error: 'Failed to scrape Dharumavantha queues' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

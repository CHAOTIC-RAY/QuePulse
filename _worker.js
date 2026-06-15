const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

const QUEUEBEE = {
  base: 'https://q04-mv.qbe.ee',
  configPath: '/config/igmh/server.json',
  defaultBranch: 'toKrLsBreyiInmDONtYdZw==',
  branchMatchers: {
    igmh: (name) => /\bigmh\b/i.test(name) && !/vill?imale|dharumavantha/i.test(name),
    vilimale: (name) => /vill?imale/i.test(name),
    dharumavantha: (name) => /dharumavantha/i.test(name),
  },
};

let queuebeeCreds = null;
let queuebeeCredsAt = 0;
let branchCache = null;
let branchCacheAt = 0;

function reqUid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function queuebeeForm(fields) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  return body;
}

function isActiveToken(token) {
  if (!token) return false;
  const t = String(token).trim().toUpperCase();
  return t !== '' && t !== '-' && t !== 'N/A' && t !== 'CLOSED' && t !== '0';
}

async function getQueueBeeCreds() {
  if (queuebeeCreds && Date.now() - queuebeeCredsAt < 3600000) return queuebeeCreds;
  const resp = await fetch(`${QUEUEBEE.base}${QUEUEBEE.configPath}`, { headers: SCRAPE_HEADERS });
  if (!resp.ok) throw new Error('QueueBee config unavailable');
  const data = await resp.json();
  queuebeeCreds = {
    client_id: data.server.client,
    country_code: data.server.country,
  };
  queuebeeCredsAt = Date.now();
  return queuebeeCreds;
}

async function queuebeePost(path, creds, extra = {}) {
  const resp = await fetch(`${QUEUEBEE.base}${path}`, {
    method: 'POST',
    headers: SCRAPE_HEADERS,
    body: queuebeeForm({
      req_uid: reqUid(),
      country_code: creds.country_code,
      client_id: creds.client_id,
      branch_id: QUEUEBEE.defaultBranch,
      ...extra,
    }),
  });
  return resp.json();
}

async function resolveBranchMap() {
  if (branchCache && Date.now() - branchCacheAt < 1800000) return branchCache;
  const creds = await getQueueBeeCreds();
  const data = await queuebeePost('/api_qapp/listbranch', creds);
  const map = {};
  if (data.status === 200 && Array.isArray(data.data)) {
    for (const [key, matcher] of Object.entries(QUEUEBEE.branchMatchers)) {
      const branch = data.data.find((b) => matcher(b.name || ''));
      if (branch?.mid) map[key] = branch.mid;
    }
  }
  branchCache = map;
  branchCacheAt = Date.now();
  return map;
}

async function scrapeQueueBeeBranch(hospital, prefix) {
  const creds = await getQueueBeeCreds();
  const branches = await resolveBranchMap();
  const branchId = branches[hospital];
  if (!branchId) throw new Error(`Branch not found for ${hospital}`);

  const data = await queuebeePost('/api_qapp/listservice', creds, { branch_id: branchId });
  if (data.status !== 200 || !Array.isArray(data.data)) {
    throw new Error(data.message || `QueueBee scrape failed for ${hospital}`);
  }

  const queues = [];
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
        counterInfo: isRoom
          ? `Room · ${dept.dept_label || 'Live'}`
          : dept.dept_label || 'Live',
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  queues.sort((a, b) => a.name.localeCompare(b.name));
  return queues;
}

async function scrapeHMH() {
  const [deptResp, labResp] = await Promise.all([
    fetch('https://hmh.gov.mv/api/queue/dept/0', { headers: SCRAPE_HEADERS }),
    fetch('https://hmh.gov.mv/api/queue/lab', { headers: SCRAPE_HEADERS }),
  ]);

  const queues = [];
  const deptData = await deptResp.json();
  if (deptData?.success && Array.isArray(deptData.data)) {
    for (const item of deptData.data) {
      if (!isActiveToken(item.TokenNo)) continue;
      queues.push({
        id: `hmh-${item.RoomID}`,
        name: item.RoomLabel,
        prefix: '',
        currentNumber: String(item.TokenNo),
        counterInfo: item.Pq === '1' ? 'Priority' : 'Live',
        lastUpdated: item.CalledOn || new Date().toISOString(),
      });
    }
  }

  const labData = await labResp.json();
  if (Array.isArray(labData?.queues)) {
    for (const item of labData.queues) {
      const token = item.currentToken || item.TokenNo;
      if (!isActiveToken(token)) continue;
      queues.push({
        id: `hmh-lab-${item.RoomID || item.id || item.RoomLabel}`,
        name: item.RoomLabel || item.name || 'Lab Service',
        prefix: '',
        currentNumber: String(token),
        counterInfo: 'Services',
        lastUpdated: new Date().toISOString(),
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
  const queues = [];

  if (Array.isArray(serviceData?.queues)) {
    for (const q of serviceData.queues) {
      if (!isActiveToken(q.currentattend)) continue;
      queues.push({
        id: `adk-s-${q.serviceid}`,
        name: q.servicename.split(':')[0].trim(),
        prefix: '',
        currentNumber: String(q.currentattend),
        counterInfo: 'Service',
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  if (Array.isArray(roomData?.rooms)) {
    for (const r of roomData.rooms) {
      if (!isActiveToken(r.token)) continue;
      queues.push({
        id: `adk-r-${r.id}`,
        name: r.doctorName || r.department || `Room ${r.room}`,
        prefix: '',
        currentNumber: String(r.token),
        counterInfo: `${r.department ? r.department + ' · ' : ''}Room ${r.room}`,
        lastUpdated: r.lastUpdated || new Date().toISOString(),
      });
    }
  }
  return queues;
}

async function scrapeVitalCare() {
  const resp = await fetch('https://token.vitalcare.com.mv/index.aspx/GetTokenData', {
    method: 'POST',
    headers: { ...SCRAPE_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({}),
  });

  const data = await resp.json();
  if (!Array.isArray(data.d)) return [];

  return data.d
    .filter((item) => item.TokenNumber !== 0 && item.DocName !== 'CLOSED')
    .map((item, i) => ({
      id: `vc-${i}`,
      name: item.DocName || 'Consultation',
      prefix: '',
      currentNumber: String(item.TokenNumber),
      counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
      lastUpdated: new Date().toISOString(),
    }));
}

const SCRAPERS = {
  '/api/hmh/queues': scrapeHMH,
  '/api/adk/queues': scrapeADK,
  '/api/vitalcare/tokens': scrapeVitalCare,
  '/api/igmh/queues': () => scrapeQueueBeeBranch('igmh', 'igmh'),
  '/api/vilimale/queues': () => scrapeQueueBeeBranch('vilimale', 'vilimale'),
  '/api/dharumavantha/queues': () => scrapeQueueBeeBranch('dharumavantha', 'dharumavantha'),
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const scraper = SCRAPERS[url.pathname];
      if (scraper) {
        try {
          const queues = await scraper();
          return Response.json(queues, {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (error) {
          return Response.json({ error: error.message, queues: [] }, { status: 502 });
        }
      }
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const redirects = [
      { paths: ['/hulhumalehosptal', '/hmh'], hospital: 'hmh' },
      { paths: ['/adkhospital', '/adk'], hospital: 'adk' },
      { paths: ['/igmh'], hospital: 'igmh' },
      { paths: ['/vilimale', '/vmh'], hospital: 'vilimale' },
      { paths: ['/dharumavantha', '/dmh'], hospital: 'dharumavantha' },
      { paths: ['/vitalcare'], hospital: 'vitalcare' },
    ];

    for (const { paths, hospital } of redirects) {
      if (paths.some((p) => url.pathname.startsWith(p))) {
        url.pathname = '/';
        url.searchParams.set('hospital', hospital);
        return Response.redirect(url.toString(), 307);
      }
    }

    return env.ASSETS.fetch(request);
  },
};

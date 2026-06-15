const SCRAPE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
};

// QueueBee (IGMH / Vilimale / Dharumavantha) — credentials from public portal config
const QUEUEBEE = {
  base: 'https://q04-mv.qbe.ee',
  configPath: '/config/igmh/server.json',
  branches: {
    igmh: 'W3LL9e6oMktRc1KK1DrwJA==',
    vilimale: 'KeB0iLWtjjvGBrxkebx/6A==',
    dharumavantha: 'toKrLsBreyiInmDONtYdZw==',
  },
};

let queuebeeCreds = null;
let queuebeeCredsAt = 0;

async function getQueueBeeCreds() {
  if (queuebeeCreds && Date.now() - queuebeeCredsAt < 3600000) return queuebeeCreds;
  const resp = await fetch(`${QUEUEBEE.base}${QUEUEBEE.configPath}`, { headers: SCRAPE_HEADERS });
  const data = await resp.json();
  queuebeeCreds = {
    client_id: data.server.client,
    country_code: data.server.country,
  };
  queuebeeCredsAt = Date.now();
  return queuebeeCreds;
}

function queuebeeForm(fields) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.append(k, v);
  return body;
}

function reqUid() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function scrapeQueueBeeBranch(hospital, prefix) {
  const creds = await getQueueBeeCreds();
  const branchId = QUEUEBEE.branches[hospital];
  if (!branchId) return [];

  const resp = await fetch(`${QUEUEBEE.base}/api_qapp/listservice`, {
    method: 'POST',
    headers: SCRAPE_HEADERS,
    body: queuebeeForm({
      req_uid: reqUid(),
      country_code: creds.country_code,
      client_id: creds.client_id,
      branch_id: branchId,
    }),
  });

  const data = await resp.json();
  if (data.status !== 200 || !Array.isArray(data.data)) return [];

  const queues = [];
  for (const dept of data.data) {
    const services = dept.dept_service_data || [];
    for (const svc of services) {
      const token = svc.serv_current_serving;
      if (!token) continue;
      queues.push({
        id: `${prefix}-${svc.serv_id}`,
        name: svc.serv_label || svc.serv_name,
        prefix: '',
        currentNumber: token,
        counterInfo: dept.dept_label || 'Live',
        lastUpdated: new Date(),
      });
    }
  }
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
  const queues = [];

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
  const raw = data.d;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item.TokenNumber !== 0)
    .map((item, i) => ({
      id: `vc-${i}`,
      name: item.DocName || 'Consultation',
      prefix: '',
      currentNumber: String(item.TokenNumber),
      counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
      lastUpdated: new Date(),
    }));
}

const SCRAPERS = {
  '/api/hmh/queues': () => scrapeHMH(),
  '/api/adk/queues': () => scrapeADK(),
  '/api/vitalcare/tokens': () => scrapeVitalCare(),
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
            headers: { 'Cache-Control': 'no-store' },
          });
        } catch (error) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      }
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Hospital vanity URLs → SPA with ?hospital= param
    const redirects = [
      { paths: ['/hulhumalehosptal', '/hmh'], hospital: 'hmh' },
      { paths: ['/adkhospital', '/adk'], hospital: 'adk' },
      { paths: ['/igmh'], hospital: 'igmh' },
      { paths: ['/vilimale'], hospital: 'vilimale' },
      { paths: ['/dharumavantha'], hospital: 'dharumavantha' },
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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // API Routes - handle these with inline functions
    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/hmh/queues') {
        return handleHMHQueues();
      }
      if (url.pathname === '/api/adk/queues') {
        return handleADKQueues();
      }
      if (url.pathname === '/api/vitalcare/tokens') {
        return handleVitalCareTokens();
      }
      if (url.pathname === '/api/igmh/queues') {
        return handleIGMHQueues();
      }
    }
    
    // Hospital-specific routing
    if (url.pathname.startsWith('/hulhumalehosptal') || url.pathname.startsWith('/hmh')) {
      url.pathname = '/';
      url.searchParams.set('hospital', 'hmh');
      return Response.redirect(url.toString(), 307);
    }
    if (url.pathname.startsWith('/adkhospital') || url.pathname.startsWith('/adk')) {
      url.pathname = '/';
      url.searchParams.set('hospital', 'adk');
      return Response.redirect(url.toString(), 307);
    }
    if (url.pathname.startsWith('/igmh')) {
      url.pathname = '/';
      url.searchParams.set('hospital', 'igmh');
      return Response.redirect(url.toString(), 307);
    }
    if (url.pathname.startsWith('/vilimale')) {
      url.pathname = '/';
      url.searchParams.set('hospital', 'vilimale');
      return Response.redirect(url.toString(), 307);
    }
    if (url.pathname.startsWith('/dharumavantha')) {
      url.pathname = '/';
      url.searchParams.set('hospital', 'dharumavantha');
      return Response.redirect(url.toString(), 307);
    }
    
    // Serve static assets
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // If ASSETS is not available, return 404
      return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleHMHQueues() {
  try {
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5IiwianRpIjoiYzUwMDUwZWM2ZTI0OWRiMDUwZjhjOTU3YmU2YWJjMTJhMDQ5OWUwYjJiYzEyYzkyOTNlZGIxNWE1MmZkMTY4ZWExYmE4N2E0NjNlZTQxYmQiLCJpYXQiOjE3NjgyMzAzMTkuNDI1MTA4LCJuYmYiOjE3NjgyMzAzMTkuNDI1MTEzLCJleHAiOjE3OTk3NjYzMTkuNDA5Miwic3ViIjoiIiwic2NvcGVzIjpbXX0.rvD_FtiWl4a9QWdempukZMq36Q_28tDqUkN8Rj2W-Nxzu_9pv37QWrZXhgtpYyd29yE-ij1lE6QEOMqUK0Yu7M9lYwCr6x-MK5ieRCop6dIGlKDla3PrE11mpFvrv768dcmfmAP449eTVr_lvqvWoRHiKMSCr_k9VnvocrKHCbpK-YtycpUpZ7n6aIynE8JIIIa7iYlXMAiRy3bs49VplHM8kmwk0hSZhgYslRo9fFk24UjoSbTLJeaNXAfmzEtCsTezQXWByrI9Om3VIvQeO1gJHya7kT2SSQJ-VfZyVT5IPtrgJL6HOp_qTgHt8Ozlvz-F4nyaf9TQQNsYy3TqKynK_b-lksdDbedQQLTo534v4PS1ZVpK2dAb7Zye-1TWfjgUqXgHahN_sAFarnac2mHGo7c1G8h7aLap5OXAnLLrukqLytLR0eg4Mg49rPrz7FdzN8OT8b5_Wl2nW_-J-ETcCzYar0Z_-w-fmWYjZJnx-C6Gm8w1P2V60cj42fG4YG_bRyLkw2MXy24mfO_64eM_0uM0fPbePIhiio7h47T0xRI19fYwZYDPayfyjA-EcdyiX9JHwrC5pRn8WME8uvIqGnUH99LM2MpJyy2PSOBWhJKsKV8HYVCtvCjFDCnFo1-SY4ppBbHroJXzcIRqndti7xjVylc6uUL-5RLNAm4';
    const apiUrl = 'https://api.hmh.gov.mv/api/queue/0';
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = await response.json();

    if (data && data.success && Array.isArray(data.data)) {
      const queues = data.data.map((item) => ({
        id: `hmh-${item.RoomID}`,
        name: item.RoomLabel,
        prefix: '',
        currentNumber: item.TokenNo,
        counterInfo: item.Pq === "1" ? 'Priority' : 'Live',
        lastUpdated: new Date(item.CalledOn)
      }));
      return Response.json(queues);
    }

    return Response.json([]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleADKQueues() {
  try {
    const [serviceResp, roomResp] = await Promise.all([
      fetch('https://www.adkhospital.mv/api/token-queues', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      }),
      fetch('https://www.adkhospital.mv/api/token-rooms', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      })
    ]);

    const serviceData = await serviceResp.json();
    const roomData = await roomResp.json();

    const queues = [];

    if (serviceData && Array.isArray(serviceData.queues)) {
      serviceData.queues.forEach((q) => {
        if (q.currentattend) {
          queues.push({
            id: `adk-s-${q.serviceid}`,
            name: q.servicename.split(':')[0].trim(),
            prefix: '',
            currentNumber: q.currentattend,
            counterInfo: 'Service',
            lastUpdated: new Date()
          });
        }
      });
    }

    if (roomData && Array.isArray(roomData.rooms)) {
      roomData.rooms.forEach((r) => {
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

    return Response.json(queues);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleVitalCareTokens() {
  try {
    const url = 'https://token.vitalcare.com.mv/index.aspx/GetTokenData';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({})
    });

    const data = await response.json();
    const rawData = data.d;

    if (!rawData || !Array.isArray(rawData)) {
      return Response.json([]);
    }

    const queues = rawData.map((item, i) => ({
      id: `vc-${i}`,
      name: item.DocName || 'Consultation',
      prefix: '',
      currentNumber: item.TokenNumber === 0 ? 'CLOSED' : item.TokenNumber.toString(),
      counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
      lastUpdated: new Date()
    }));

    return Response.json(queues);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function handleIGMHQueues() {
  try {
    // IGMH placeholder - needs API integration
    return Response.json([]);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

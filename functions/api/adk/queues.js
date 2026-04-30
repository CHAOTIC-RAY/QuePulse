export async function onRequest(context) {
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

    // Process Service Queues
    if (serviceData && Array.isArray(serviceData.queues)) {
      serviceData.queues.forEach((q) => {
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

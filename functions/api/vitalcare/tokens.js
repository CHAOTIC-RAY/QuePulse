export async function onRequest(context) {
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

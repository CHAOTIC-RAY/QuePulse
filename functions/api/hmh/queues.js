export async function onRequest(context) {
  try {
    const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5IiwianRpIjoiYzUwMDUwZWM2ZTI0OWRiMDUwZjhjOTU3YmU2YWJjMTJhMDQ5OWUwYjJiYzEyYzkyOTNlZGIxNWE1MmZkMTY4ZWExYmE4N2E0NjNlZTQxYmQiLCJpYXQiOjE3NjgyMzAzMTkuNDI1MTA4LCJuYmYiOjE3NjgyMzAzMTkuNDI1MTEzLCJleHAiOjE3OTk3NjYzMTkuNDA5Miwic3ViIjoiIiwic2NvcGVzIjpbXX0.rvD_FtiWl4a9QWdempukZMq36Q_28tDqUkN8Rj2W-Nxzu_9pv37QWrZXhgtpYyd29yE-ij1lE6QEOMqUK0Yu7M9lYwCr6x-MK5ieRCop6dIGlKDla3PrE11mpFvrv768dcmfmAP449eTVr_lvqvWoRHiKMSCr_k9VnvocrKHCbpK-YtycpUpZ7n6aIynE8JIIIa7iYlXMAiRy3bs49VplHM8kmwk0hSZhgYslRo9fFk24UjoSbTLJeaNXAfmzEtCsTezQXWByrI9Om3VIvQeO1gJHya7kT2SSQJ-VfZyVT5IPtrgJL6HOp_qTgHt8Ozlvz-F4nyaf9TQQNsYy3TqKynK_b-lksdDbedQQLTo534v4PS1ZVpK2dAb7Zye-1TWfjgUqXgHahN_sAFarnac2mHGo7c1G8h7aLap5OXAnLLrukqLytLR0eg4Mg49rPrz7FdzN8OT8b5_Wl2nW_-J-ETcCzYar0Z_-w-fmWYjZJnx-C6Gm8w1P2V60cj42fG4YG_bRyLkw2MXy24mfO_64eM_0uM0fPbePIhiio7h47T0xRI19fYwZYDPayfyjA-EcdyiX9JHwrC5pRn8WME8uvIqGnUH99LM2MpJyy2PSOBWhJKsKV8HYVCtvCjFDCnFo1-SY4ppBbHroJXzcIRqndti7xjVylc6uUL-5RLNAm4';
    const url = 'https://api.hmh.gov.mv/api/queue/0';
    
    const response = await fetch(url, {
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

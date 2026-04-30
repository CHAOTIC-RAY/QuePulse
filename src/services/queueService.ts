/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Queue } from '../types';

export const queueService = {
  getExternalHMHQueues: async (): Promise<Queue[]> => {
    try {
      // Use cors.eu.org proxy because it forwards Authorization headers for HMH seamlessly
      const targetUrl = 'https://api.hmh.gov.mv/api/queue/0';
      const proxyUrl = `https://cors.eu.org/${targetUrl}`;
      const token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5IiwianRpIjoiYzUwMDUwZWM2ZTI0OWRiMDUwZjhjOTU3YmU2YWJjMTJhMDQ5OWUwYjJiYzEyYzkyOTNlZGIxNWE1MmZkMTY4ZWExYmE4N2E0NjNlZTQxYmQiLCJpYXQiOjE3NjgyMzAzMTkuNDI1MTA4LCJuYmYiOjE3NjgyMzAzMTkuNDI1MTEzLCJleHAiOjE3OTk3NjYzMTkuNDA5Miwic3ViIjoiIiwic2NvcGVzIjpbXX0.rvD_FtiWl4a9QWdempukZMq36Q_28tDqUkN8Rj2W-Nxzu_9pv37QWrZXhgtpYyd29yE-ij1lE6QEOMqUK0Yu7M9lYwCr6x-MK5ieRCop6dIGlKDla3PrE11mpFvrv768dcmfmAP449eTVr_lvqvWoRHiKMSCr_k9VnvocrKHCbpK-YtycpUpZ7n6aIynE8JIIIa7iYlXMAiRy3bs49VplHM8kmwk0hSZhgYslRo9fFk24UjoSbTLJeaNXAfmzEtCsTezQXWByrI9Om3VIvQeO1gJHya7kT2SSQJ-VfZyVT5IPtrgJL6HOp_qTgHt8Ozlvz-F4nyaf9TQQNsYy3TqKynK_b-lksdDbedQQLTo534v4PS1ZVpK2dAb7Zye-1TWfjgUqXgHahN_sAFarnac2mHGo7c1G8h7aLap5OXAnLLrukqLytLR0eg4Mg49rPrz7FdzN8OT8b5_Wl2nW_-J-ETcCzYar0Z_-w-fmWYjZJnx-C6Gm8w1P2V60cj42fG4YG_bRyLkw2MXy24mfO_64eM_0uM0fPbePIhiio7h47T0xRI19fYwZYDPayfyjA-EcdyiX9JHwrC5pRn8WME8uvIqGnUH99LM2MpJyy2PSOBWhJKsKV8HYVCtvCjFDCnFo1-SY4ppBbHroJXzcIRqndti7xjVylc6uUL-5RLNAm4';
      
      let response = await fetch('/api/hmh/queues');
      let data;
      
      // If local API fails or returns HTML (like on static hosts), fallback to CORS proxy
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        response = await fetch(proxyUrl, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const json = await response.json();
        if (json && json.success && Array.isArray(json.data)) {
           return json.data.map((item: any) => ({
             id: `hmh-${item.RoomID}`,
             name: item.RoomLabel,
             prefix: '',
             currentNumber: item.TokenNo,
             counterInfo: item.Pq === "1" ? 'Priority' : 'Live',
             lastUpdated: new Date(item.CalledOn)
           }));
        }
        return [];
      } else {
        return await response.json();
      }
    } catch (e) {
      console.error('Failed to fetch HMH queues', e);
      return [];
    }
  },

  getExternalVitalCareQueues: async (): Promise<Queue[]> => {
    try {
      const targetUrl = 'https://token.vitalcare.com.mv/index.aspx/GetTokenData';
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${targetUrl}`;
      
      let response = await fetch('/api/vitalcare/tokens');
      
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        response = await fetch(proxyUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({})
        });
        const json = await response.json();
        const rawData = json.d;
        if (!rawData || !Array.isArray(rawData)) return [];
        return rawData.map((item: any, i: number) => ({
          id: `vc-${i}`,
          name: item.DocName || 'Consultation',
          prefix: '',
          currentNumber: item.TokenNumber === 0 ? 'CLOSED' : item.TokenNumber.toString(),
          counterInfo: `Room ${item.RoomNumber} (${item.RoomFloor})`,
          lastUpdated: new Date()
        }));
      } else {
        return await response.json();
      }
    } catch (e) {
      console.error('Failed to fetch Vital Care queues', e);
      return [];
    }
  },

  getExternalADKQueues: async (): Promise<Queue[]> => {
    try {
      let response = await fetch('/api/adk/queues');
      
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        const proxyUrlService = `https://api.codetabs.com/v1/proxy?quest=https://www.adkhospital.mv/api/token-queues`;
        const proxyUrlRoom = `https://api.codetabs.com/v1/proxy?quest=https://www.adkhospital.mv/api/token-rooms`;

        const [serviceResp, roomResp] = await Promise.all([
          fetch(proxyUrlService),
          fetch(proxyUrlRoom)
        ]);

        const serviceData = await serviceResp.json();
        const roomData = await roomResp.json();

        const queues: Queue[] = [];

        if (serviceData && Array.isArray(serviceData.queues)) {
          serviceData.queues.forEach((q: any) => {
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
          roomData.rooms.forEach((r: any) => {
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

        return queues;
      } else {
        return await response.json();
      }
    } catch (e) {
      console.error('Failed to fetch ADK queues', e);
      return [];
    }
  }
};

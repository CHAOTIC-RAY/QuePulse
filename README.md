# QuePulse

**Live hospital queue tracking for the Maldives** — open source, mobile-first, and free to use.

QuePulse pulls real-time token numbers from hospital websites (no official APIs) and shows them in one place. Track your token, filter by room type, and get smart alerts when your turn is near — on the web, as a PWA, or as an Android APK.

---

## What QuePulse does

- **Live queue boards** — See which token is currently being served at each counter, room, or service desk.
- **Multi-hospital support** — Malé, Greater Malé, and atoll hospitals in a single app.
- **Smart alerts** — Enter your token number and get notified when you are 1–10 numbers away (browser + service worker background polling).
- **Category filters** — Chips for Rooms, OPD, Diagnostics, Registration, Services, and more.
- **Hospital directory** — Quick access to emergency numbers and hospital phone contacts.
- **Dark & light mode** — System-aware theme with manual override.
- **Install anywhere** — PWA (Add to Home Screen), Android APK (GitHub Actions build), or use in the browser.

---

## Supported hospitals

| Hospital | Region | Data source |
|----------|--------|-------------|
| Hulhumalé Hospital (HMH) | Greater Malé | `hmh.gov.mv` JSON API |
| ADK Hospital | Malé | `adkhospital.mv` token API |
| Vital Care | Malé | ASP.NET `GetTokenData` endpoint |
| IGMH | Malé | QueueBee (`q04-mv.qbe.ee`) |
| Vilimale Hospital | Vilimale | QueueBee |
| Dharumavantha Hospital | Malé | QueueBee |
| Ungoofaaru Regional Hospital (URH) | Raa Atoll | `q.urh.gov.mv` HTML |
| Faafu Atoll Hospital (FAH) | Faafu Atoll | `fah.gov.mv/TokenStatus` HTML |
| Shaviyani Atoll Hospital | Sh. Funadhoo | `q.shah.gov.mv` HTML *(may be intermittent)* |

Queue data is scraped in real time from each hospital’s public queue page. QuePulse does not store patient data on a central server.

---

## How it works

```
┌─────────────┐     fetch /api/*      ┌──────────────────┐
│  React PWA  │ ◄──────────────────► │  API layer       │
│  (browser   │                       │  server.ts (dev) │
│   or APK)   │                       │  _worker.js (prod)│
└──────┬──────┘                       └────────┬─────────┘
       │                                       │
       │  Service Worker polls every 12s       │  scrape hospital sites
       │  when token tracking is active        ▼
       ▼                              ┌──────────────────┐
  Notifications                       │ Hospital websites │
  (desktop + mobile)                  │ (no official API) │
                                      └──────────────────┘
```

1. **Frontend** — React + Vite PWA. User picks a hospital → `QueueBoard` polls `/api/{hospital}/queues` every 12 seconds.
2. **API layer** — In development, `server.ts` (Express) runs scrapers and proxies Vite. In production, Cloudflare Worker (`_worker.js`) serves the built app and the same scrape routes.
3. **Scrapers** — Each hospital has a dedicated scraper that fetches the hospital’s public queue page/API and normalizes results into a common `Queue` shape (`id`, `name`, `currentNumber`, `counterInfo`).
4. **Alerts** — When you track a token, state is saved in `localStorage` and synced to the service worker (`src/sw.ts`), which polls in the background and fires `showNotification` when your token is within the chosen threshold.

---

## Scrapers

| Endpoint | Scraper | External source |
|----------|---------|-----------------|
| `GET /api/hmh/queues` | `scrapeHMH()` | `https://hmh.gov.mv/api/queue/dept/0` + `/api/queue/lab` |
| `GET /api/adk/queues` | `scrapeADK()` | `https://www.adkhospital.mv/api/token-queues` + `token-rooms` |
| `GET /api/vitalcare/tokens` | `scrapeVitalCare()` | `POST https://token.vitalcare.com.mv/index.aspx/GetTokenData` |
| `GET /api/igmh/queues` | `scrapeQueueBeeBranch('igmh')` | QueueBee: config → `listbranch` → `listservice` |
| `GET /api/vilimale/queues` | `scrapeQueueBeeBranch('vilimale')` | Same QueueBee platform, Vilimale branch |
| `GET /api/dharumavantha/queues` | `scrapeQueueBeeBranch('dharumavantha')` | Same QueueBee platform, Dharumavantha branch |
| `GET /api/urh/queues` | `scrapeURH()` | `https://q.urh.gov.mv/` — HTML parse (services + doctor queues) |
| `GET /api/fah/queues` | `scrapeFAH()` | `https://fah.gov.mv/TokenStatus` — HTML table parse |
| `GET /api/shah/queues` | `scrapeShah()` | `https://q.shah.gov.mv/` — HTML parse |

**QueueBee flow (IGMH family):** Load `server.json` for credentials → `listbranch` to resolve branch IDs by name → `listservice` for live tokens. Branch IDs are resolved dynamically (not hardcoded).

Scraper logic lives in `_worker.js` (production) and `server.ts` (local dev). Keep both in sync when adding hospitals.

---

## Run locally

**Requirements:** Node.js 20+

```bash
# Clone the repo
git clone https://github.com/CHAOTIC-RAY/QuePulse.git
cd QuePulse

# Install dependencies
npm install

# Start dev server (Express + Vite + scrapers on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other commands

| Command | Description |
|---------|-------------|
| `npm run build` | Production web build → `dist/` |
| `npm run lint` | TypeScript check |
| `npm run preview` | Build + Wrangler dev (Cloudflare Worker locally) |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run build:mobile` | Build web + sync to Capacitor Android |
| `npm run build:apk` | Build debug APK (requires Android SDK + `ANDROID_HOME`) |

### Deep links

- `/?hospital=hmh` — Open directly to HMH queues  
- `/hmh`, `/adk`, `/igmh`, etc. — Redirect to home with hospital pre-selected (production worker)

---

## Android APK

APKs are built automatically on GitHub Actions when changes are pushed to `main`.

1. Go to **Actions** → **Build Android APK** → latest run.
2. Download the **quepulse-debug-apk** artifact (`app-debug.apk`).

To build locally:

```bash
npm run build:apk
# Output: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Project structure

```
├── src/                 # React app (components, hooks, services)
├── public/              # Icons, hospital logos, PWA assets
├── _worker.js           # Cloudflare Worker (scrapers + SPA)
├── server.ts            # Local dev server (same scrapers)
├── android/             # Capacitor Android project
├── wrangler.jsonc       # Cloudflare deploy config
└── .github/workflows/   # CI: lint, build, APK
```

---

## Contributing

This is an open source community project. Contributions welcome:

- Add or fix scrapers when hospital sites change
- Improve mobile UX and accessibility
- Report hospitals with online queues we have not integrated yet

Please open an issue before large changes. Test scrapers locally with `npm run dev` before submitting a PR.

---

## Disclaimer

QuePulse reads publicly available queue information from hospital websites. It is **not affiliated** with any hospital or the Ministry of Health. Token numbers and wait times are only as accurate as the source systems. Always confirm with hospital staff when it is your turn.

---

## Contact & credits

**chaos.studio.mv@gmail.com**

Created from Passion by [chaos.studio](https://portfolio.chaoticstudio.workers.dev/studio)

**+960 9401011** (Telegram)

---

## License

Open source — see repository license file for terms.

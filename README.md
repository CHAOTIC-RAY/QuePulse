# QuePulse

**Live hospital queue tracking for the Maldives** — open source, mobile-first, and free to use.

QuePulse pulls real-time token numbers from hospital websites (no official APIs) and shows them in one place. Track your token, filter by room type, estimate wait times, and get smart alerts when your turn is near — on the web, as a PWA, or as an Android APK.

**Live:** [quepulse.chaoticstudio.workers.dev](https://quepulse.chaoticstudio.workers.dev)

---

## Features

### Live queue tracking
- Real-time token numbers from **9 hospitals** across Malé, Greater Malé, and the atolls
- Auto-refresh every **12 seconds** on queue boards
- Live status indicators on hospital cards and counters
- Search counters, rooms, doctors, and token numbers
- Recent token history per room (last 5 numbers)
- Deep links: `/?hospital=hmh` or `/hmh`, `/adk`, etc.

### Smart alerts & notifications
- Track your token globally or per specific counter/room
- Alert when **1, 2, 3, 5, or 10** numbers away (configurable)
- Browser notifications + **service worker** background polling (12s)
- Quick alert setup from the mobile dashboard home screen
- Advanced alert settings panel (per-hospital, thresholds, test notification)
- Tracking persists across sessions (`localStorage` + SW sync)

### Wait time estimates (ETA)
- **Per-room pace** — e.g. `~3 min/token` based on how fast tokens change
- **Personal wait ETA** when tracking a token
- Token change history stored locally with timestamps
- ETA pace **cached for 30 minutes** per room, then recalculated from fresh data
- Desktop live tracking banner with patients-left count

### Priority numbers
- **Priority number** badge when hospitals flag priority tokens (e.g. HMH `Pq` field)
- Auto-detects when a token **jumps 5+ ahead** in one update
- Visible on queue rows and room detail sheets

### Room organization & filters
- Category chips: **Rooms, OPD, Emergency, Diagnostics, Registration, Services**
- HMH rooms organized like ADK: `GOPD · Room K102`, lab as `Diagnostics · Lab`
- Region filters on hospital list: Malé, Greater Malé, North, Atolls
- Grouped queue sections by category inside each hospital

### Mobile-first UI
- **Home dashboard** — recent hospital hero, quick alert, all hospitals list
- **Hospitals tab** — full directory with region chips
- **Alerts tab** — separated in bottom nav (Home | Hospitals grouped, Alerts alone)
- Glassmorphism bottom navigation bar
- No top bar on mobile/APK home — logo + theme toggle in dashboard header
- Native **Android back button** + browser swipe-back navigation stack
- Safe-area padding for notched phones
- Dark & light mode (system-aware + manual toggle)
- PWA install banner on mobile web
- Responsive desktop layout with sidebar + APK QR download

### Hospital directory & emergency
- One-tap **119** emergency call
- Hospital phone directory panel (searchable contacts)
- Hospital logos, locations, and live badges

### Android APK
- Capacitor 8 native Android app
- GitHub Actions **release APK** build on every `main` push
- [Download latest APK](https://github.com/CHAOTIC-RAY/QuePulse/releases/download/latest-apk/quepulse.apk)
- Optional production signing via GitHub secrets
- Desktop sidebar QR code for quick APK install

### Privacy & architecture
- **No central patient database** — queue data scraped live from public hospital pages
- Tracking state stored **only on your device**
- Open source scrapers — inspect exactly what is fetched

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

1. **Frontend** — React 19 + Vite 6 PWA. User picks a hospital → `QueueBoard` polls `/api/{hospital}/queues` every 12 seconds.
2. **API layer** — In development, `server.ts` (Express) runs scrapers and proxies Vite. In production, Cloudflare Worker (`_worker.js`) serves the built app and the same scrape routes.
3. **Scrapers** — Each hospital has a dedicated scraper that normalizes results into `Queue` (`id`, `name`, `currentNumber`, `counterInfo`, `isPriority`).
4. **Alerts** — Tracking state in `localStorage`, synced to `src/sw.ts` for background polling and `showNotification` when within threshold.
5. **ETA** — Token timestamps in `localStorage`; pace cached 30 min per room in `mv_queue_eta_cache`.

---

## Scrapers

| Endpoint | Scraper | External source |
|----------|---------|-----------------|
| `GET /api/hmh/queues` | `scrapeHMH()` | `hmh.gov.mv/api/queue/dept/0` + `/api/queue/lab` |
| `GET /api/adk/queues` | `scrapeADK()` | `adkhospital.mv` token-queues + token-rooms |
| `GET /api/vitalcare/tokens` | `scrapeVitalCare()` | `token.vitalcare.com.mv` GetTokenData |
| `GET /api/igmh/queues` | `scrapeQueueBeeBranch('igmh')` | QueueBee listbranch → listservice |
| `GET /api/vilimale/queues` | `scrapeQueueBeeBranch('vilimale')` | QueueBee Vilimale branch |
| `GET /api/dharumavantha/queues` | `scrapeQueueBeeBranch('dharumavantha')` | QueueBee Dharumavantha branch |
| `GET /api/urh/queues` | `scrapeURH()` | `q.urh.gov.mv` HTML |
| `GET /api/fah/queues` | `scrapeFAH()` | `fah.gov.mv/TokenStatus` HTML |
| `GET /api/shah/queues` | `scrapeShah()` | `q.shah.gov.mv` HTML |

**QueueBee flow:** Load `server.json` → `listbranch` (dynamic branch IDs) → `listservice` for live tokens.

Scraper logic lives in `_worker.js` (production) and `server.ts` (local dev). **Keep both in sync** when adding hospitals.

---

## Run locally

**Requirements:** Node.js 20+

```bash
git clone https://github.com/CHAOTIC-RAY/QuePulse.git
cd QuePulse
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Express + Vite + scrapers (port 3000) |
| `npm run build` | Production web build → `dist/` |
| `npm run lint` | TypeScript check |
| `npm run preview` | Build + Wrangler dev |
| `npm run deploy` | Build + deploy to Cloudflare Workers |
| `npm run build:mobile` | Build web + Capacitor sync |
| `npm run build:apk` | Build release APK (needs Android SDK) |
| `npm run icons` | Regenerate PWA/APK icons from `logo-source.png` |

---

## Android APK

Release APKs build automatically on GitHub Actions when changes are pushed to `main`.

- **Download:** [latest-apk/quepulse.apk](https://github.com/CHAOTIC-RAY/QuePulse/releases/download/latest-apk/quepulse.apk)
- **CI artifact:** Actions → Build Android APK → `quepulse-release-apk`

### Production signing (optional)

| Secret | Description |
|--------|-------------|
| `ANDROID_KEYSTORE_BASE64` | Base64 `.jks` / `.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | Key alias |
| `ANDROID_KEY_PASSWORD` | Key password |

---

## Project structure

```
├── src/
│   ├── components/     # UI (MobileDashboard, QueueBoard, BottomNav, …)
│   ├── hooks/          # useTheme, useMobileNavigation, …
│   ├── lib/            # categories, queueTiming, notifications
│   ├── services/       # queueService API client
│   └── sw.ts           # Service worker (background alerts)
├── public/             # Icons, hospital logos
├── _worker.js          # Cloudflare Worker (scrapers + SPA)
├── server.ts           # Local dev server
├── android/            # Capacitor Android project
└── .github/workflows/  # CI: lint, build, APK
```

### Local storage keys

| Key | Purpose |
|-----|---------|
| `mv_queue_tracking` | Active token alert config |
| `mv_queue_history` | Recent tokens per room |
| `mv_queue_history_times` | Timestamped token changes (ETA input) |
| `mv_queue_eta_cache` | Cached room pace (30 min TTL) |
| `qp_recent_hospitals` | Recent hospital IDs for dashboard |
| `qp_theme` | Light / dark / system |

---

## Contributing

Contributions welcome:

- Add or fix scrapers when hospital sites change
- Improve mobile UX and accessibility
- Report hospitals with online queues not yet integrated

Open an issue before large changes. Test with `npm run dev` before submitting a PR.

---

## Disclaimer

QuePulse reads publicly available queue information from hospital websites. It is **not affiliated** with any hospital or the Ministry of Health. Token numbers and wait times are only as accurate as the source systems. ETA estimates are approximations based on recent token pace. Always confirm with hospital staff when it is your turn.

---

## Contact & credits

**chaos.studio.mv@gmail.com**

Created from Passion by [chaos.studio](https://portfolio.chaoticstudio.workers.dev/studio)

**+960 9401011** (Telegram)

---

## License

Open source — see repository license file for terms.

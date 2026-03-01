# 🚄 [TrainTracker](https://traintracker.app)

Live tracking North American intercity passenger rail – 🇺🇸 Amtrak, 🇨🇦 VIA Rail, 🌴 Brightline. Check train schedules with a live-updating timeline, and visualize realtime positions on an interactive map.

## Features

- 🔍 Train search by stops, name, and number
- 📍 Live train positions on on a map, estimated between GPS updates
- 🔔 Per-stop push notifications for arrivals and departures
- 🌗 Light/dark mode, configurable units and timezone display
- 📱 Desktop- and mobile-optimized UIs

## Getting Started

```bash
npm install
npm run dev
```

Opens at [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env` and fill in your VAPID keys (required for push notifications):

```bash
cp .env.example .env
```

Generate VAPID keys with:

```bash
npx web-push generate-vapid-keys
```

## Commands

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Start the development server |
| `npm run build`    | Build for production         |
| `npm start`        | Run the production build     |
| `npm run lint`     | Lint and format check        |
| `npx tsc --noEmit` | Type check                   |

## Architecture

### Data flow

1. **API layer** (`app/api/trains/`) — Fetches and decrypts train data from Amtrak, VIA Rail, and Brightline data providers
2. **Train provider** (`app/providers/train.tsx`) — Polls the API seconds and distributes data via React context
3. **Track snapping** (`app/components/Map/calc.ts`) — Snaps GPS coordinates to the nearest point on track geometries using Turf.js; extrapolates position between updates based on timetable
4. **Map rendering** (`app/components/Map/`) — Displays trains on a MapLibre GL map via `react-map-gl` with custom markers, labels, and route styling

### Key directories

```
app/
├── api/             # Next.js API routes (trains, notifications)
├── components/      # React components (Map, timeline, notifications)
│   └── Map/         # Map system: rendering, track snapping, display logic
├── providers/       # React context providers (train data, settings)
├── lib/             # Shared utilities (Prisma client, notification polling)
└── types.ts         # Shared TypeScript types
public/
└── map_data/        # GeoJSON track geometries
db/
├── schema.prisma    # Database schema
└── migrations/      # Prisma migrations
```

### GTFS data import

On startup, `app/lib/gtfs-import.ts` downloads and parses GTFS feeds for each agency, then:

1. Imports stops and trips into the SQLite database (used at runtime for station lookups and track shape resolution)
2. Generates `public/map_data/track.json` — the GeoJSON LineString features used to render tracks on the map

Results are cached for 24 hours (tracked via `GtfsImportMeta`) so subsequent restarts skip the download. In production the filesystem is read-only, so the GeoJSON is pre-built during the Docker image build and only the database upsert runs at startup.

### Database

Uses **SQLite** via **Prisma**. The database file (`db/app.db`) is created automatically on first run; migrations run on startup. The schema has four models:

| Model              | Purpose                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `PushSubscription` | Web push credentials, plus the train, stop, and notification type a user subscribed to |
| `GtfsStop`         | Station records from GTFS feeds (code, name, coordinates, timezone)                    |
| `GtfsTrip`         | Trip records linking train numbers to GTFS shape IDs                                   |
| `GtfsImportMeta`   | Singleton that records the last successful import time for the 24-hour cache           |

### Push notifications

A server-side background poller (`app/lib/notifications.ts`) checks train status every 30 seconds and sends web push notifications 5 minutes before a subscribed arrival or departure. A service worker (`public/service-worker.js`) handles delivery in the browser background.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for instructions on deploying to a VPS with Docker and nginx.

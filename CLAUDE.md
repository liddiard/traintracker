# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that tracks and visualizes real-time Amtrak, VIA Rail, and Brightline train positions and schedules on an interactive map. The app fetches train data from the Amtraker API, snaps train positions to track geometries using Turf.js, and displays them on a MapLibre map with route-specific styling.

## General instructions

Always use context7 when I need code generation, setup or configuration steps, or library/API documentation related to the following packages: Turf.js, TailwindCSS, Maplibre GL JS, React Map GL, Prisma, Web Push, and Next.js. This means you should automatically use the Context7 MCP tools to resolve library id and get library docs without me having to explicitly ask.

## Development Commands

### Running the Development Server

```bash
npm run dev
```

Opens at http://localhost:3000

### Building for Production

```bash
npm run build
```

### Running Production Build

```bash
npm start
```

### Linting

```bash
npm run lint
```

### Git Hooks

- Pre-commit hook runs `lint-staged` which formats all staged files with Prettier
- Managed by husky

## Architecture

### Data Flow

1. **API Layer** (`app/api/trains/route.ts`): Fetches train data from Amtraker API with 1-minute cache
2. **Data Transformation** (`app/utils.ts`): `formatTrainResponse` converts raw API data to typed Train objects with Date objects
3. **Train Context Provider** (`app/providers/train.tsx`): Polls train data every 15 seconds and provides it to the app
4. **Settings Context Provider** (`app/providers/settings.tsx`): Manages user settings (map style, color theme, units, time format, timezone) with localStorage persistence

### Database & ORM

The app uses **Prisma** as the ORM with a **SQLite** database for storing push notification subscriptions.

- **Schema** (`db/schema.prisma`): Defines the `PushSubscription` model with web push credentials, train/stop identifiers, and notification preferences
- **Client** (`app/lib/prisma.ts`): Singleton Prisma client instance with connection pooling
- **Migrations**: Located in `db/migrations/` - Prisma manages schema changes
- **Database file**: `db/app.db` (gitignored, auto-created on first run)

The database is queried by the notification API endpoints and the background polling system to manage subscription state.

### Map System (`app/components/Map/`)

The map visualization system is the core feature and has several interconnected parts:

- **Track Snapping** (`calc.ts`): Snaps GPS-reported train positions to the nearest point on Amtrak track geometries using Turf.js operations
  - `snapTrainToTrack`: Finds nearby track features using bounding box clipping and snaps train to nearest point
  - `getExtrapolatedTrainPoint`: Extrapolates train position based on timetable when between stations
  - `getHeading`: Calculates train bearing/heading along track geometry

- **Track Data**: GeoJSON files in `public/map_data/amtrak-track.geojson` contain LineString/MultiLineString features representing physical track geometries with OBJECTID properties

- **Display Logic** (`display.ts`): Converts train positions to map-ready features with styling

- **Rendering**: Uses MapLibre GL JS via `react-map-gl` with custom train markers and labels

### Key Data Types (`app/types.ts`)

- `Train`: Processed train object with stations array, GPS coordinates, and metadata
- `TrainStatus`: Computed status including prev/current/next stations, delay time, and TimeStatus code
- `Station`/`StationTrain`: Station metadata and train-specific station timing
- `TimeStatus` enum: PREDEPARTURE, ON_TIME, DELAYED, COMPLETE

### Train Status Calculation (`app/utils.ts`)

- `getTrainStatus`: Determines train status by comparing actual vs scheduled times
- `getDelayColor`: Maps delay minutes to color gradient (yellow-orange to red)
- `getTrainColor`: Returns status-appropriate colors (blue=predeparture, green=on-time, gradient=delayed, deep-blue=complete)

### Caching Strategy

The codebase uses custom caching via `createCachedFunction` utility for expensive operations:

- `snapTrainToTrackCached`: Caches track snapping by train objectID, invalidates on updatedAt change
- `getTrackSegmentCached`: Caches track segments between station pairs

### Amtrak API Integration (`app/api/trains/amtrak.ts`)

The Amtrak data endpoint is encrypted. The `decrypt` function:

1. Derives AES key using PBKDF2 with hardcoded salt and public key
2. Decrypts train data and private key from response
3. Returns JSON train data

### Push Notification System

The app supports web push notifications for train arrival and departure alerts. The system consists of server-side polling, a RESTful API, and client-side service worker integration.

**Architecture:**

- **Background Polling** (`app/lib/notifications.ts`): Server-side polling system that checks train status every 30 seconds
  - Queries active (unsent) subscriptions from database
  - Fetches current train data and compares with scheduled times
  - Sends push notifications 5 minutes before arrival/departure
  - Marks subscriptions as `sent: true` after sending to prevent duplicates

- **Notification API** (`app/api/notifications/route.ts`): RESTful endpoint using HTTP methods
  - `GET` - Check active subscriptions for a device + train (query params: `endpoint`, `trainId`)
  - `POST` - Create new subscription (body: `subscription`, `trainId`, `stopCode`, `notificationType`, `timeFormat`)
  - `DELETE` - Remove subscription (body: `endpoint`, `trainId`, `stopCode`, `notificationType`)
  - Enforces 20 subscription limit per device

- **Service Worker** (`public/service-worker.js`): Handles push events in the browser background
  - Registered on app load via `ServiceWorkerRegistration` component
  - Receives push notifications and displays them to the user
  - Works even when the browser tab is not active

- **Frontend Integration** (`app/components/NotificationButton.tsx`, `app/components/NotificationDialog.tsx`):
  - Bell icon on timeline stops allows subscribing to arrival/departure notifications
  - Uses `useNotifications` hook to manage permissions and subscriptions
  - Visual feedback (yellow bell) indicates active notifications

**Configuration:**

- Requires VAPID keys for web push authentication (stored in environment variables)
- `ENABLE_NOTIFICATIONS` env var enables polling in development mode
- Notification timing threshold is 5 minutes before scheduled arrival/departure

**Key Types:**

- `NotificationType`: 'arrival' | 'departure'
- `ActiveSubscription`: Minimal subscription data returned to frontend (stopCode, notificationType)
- `PushSubscription` (Prisma model): Full subscription record with web push credentials

## Configuration Notes

### TypeScript

- Uses `@/` path alias for project root
- Target: ES2017
- Strict mode enabled
- Prefer functional programming style (array `.map`, `.reduce`, etc.)

### Next.js Config

- `reactStrictMode: false` - disabled to prevent double-renders
- Custom webpack config for `.geojson` and `.svg` file handling

### Styling

- Tailwind CSS v4
- Theme supports light/dark modes via `colorMode` setting
- Amtrak brand colors defined in `app/constants.ts`

## Important Implementation Details

### Train Position Updates

- GPS positions are snapped to track geometries for accuracy
- Between position updates (15s polling), trains are extrapolated along track segments based on scheduled arrival times
- Bearing is calculated from track geometry, not GPS heading

### GeoJSON Track Format

Track features can be either `LineString` or `MultiLineString`:

- For `MultiLineString`, track index is tracked to identify correct segment
- Bounding box clipping is used for performance when finding nearby tracks

### Date/Time Handling

- All API timestamps are converted to Date objects on ingestion
- Timezone-aware formatting uses station-specific timezones
- Settings support both local (station) and device timezone display

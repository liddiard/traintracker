# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application that tracks and visualizes real-time Amtrak, Via Rail, and Brightline train positions and schedules on an interactive map. The app fetches train data from the Amtraker API, snaps train positions to track geometries using Turf.js, and displays them on a MapLibre map with route-specific styling.

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

### Map System (`app/components/Map/`)

The map visualization system is the core feature and has several interconnected parts:

- **Track Snapping** (`calc.ts`): Snaps GPS-reported train positions to the nearest point on Amtrak track geometries using Turf.js operations
  - `snapTrainToTrack`: Finds nearby track features using bounding box clipping and snaps train to nearest point
  - `getExtrapolatedTrainPoint`: Extrapolates train position based on timetable when between stations
  - `getBearing`: Calculates train bearing/heading along track geometry

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

## Configuration Notes

### TypeScript

- Uses `@/` path alias for project root
- Target: ES2017
- Strict mode enabled

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

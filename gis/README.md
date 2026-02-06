# GIS data

Data in this directory is intended to be read and edited with a GIS application (like QGIS) to generate the exported GeoJSON files used by the frontend application. The files in this directory should not be used by the frontend application directly.

## Data sources

### Track

#### Amtrak

[GTFS file](https://content.amtrak.com/content/gtfs/GTFS.zip) [via Transitland](https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle)

**Notes:**

- Gold Runner (formerly San Joaquins) track is missing from Amtrak GTFS data. As such, TrainTracker supplements it with [USDOT track data](https://data-usdot.opendata.arcgis.com/datasets/amtrak-routes/explore). More details below.
- Note: We don't import the GTFS ZIP file which Amtrak hosts directly, instead using [a copy that TrainTracker hosts on Amazon S3](https://traintracker-app.s3.us-west-2.amazonaws.com/GTFS/amtrak.zip). Why? On Jan 24, 2026, Amtrak updated their GTFS file and mangled its shapes.txt data, incorrectly connecting track points across hundreds of miles which shouldn't be contiguous. The problem was not corrected in a timely fashion. This, along with unrelated discrepancies in their realtime data, leads me to distrust their QA process – if one exists at all. "If you want something done right, do it yourself." Hosting the files ourselves lets us QA Amtrak's latest data and ensure that a broken version doesn't go live.

#### VIA Rail

[GTFS file](https://www.viarail.ca/sites/all/files/gtfs/viarail.zip) via [VIA Rail developer resources](https://www.viarail.ca/en/developer-resources)

#### Brightline

[GTFS file](http://feed.gobrightline.com/bl_gtfs.zip) via [Transitland](https://www.transit.land/feeds/f-brightline~trails)

## Background

Originally, this directory was about processing track data from transit agencies, largely from GTFS data, to remove duplicate points (multiple layers of the same track) in order to achieve the most minimal file size. See commit a61d4cea2bd561638395a6467784d7937443db68 for these work-in-progress scripts.

Idea was to snap train to a track based only on its GPS location proximity. In practice, this didn't work very well because tracks split and merge, so they're not contiguous for a single train. On the other hand, GTFS data for all agencies have a shapes.txt that includes a dedicated rail LineString for each route ("trips.txt").

In practice, this worked much better for snapping trains to their correct track, despite the heavier file size. The `app/lib/gtfs-import.ts` startup script imports GTFS rail line data from transit agencies and generates the equivalent GeoJSON.

## Fixing Amtrak data

Amtrak's GTFS shapes.txt is missing the [Gold Runner](https://en.wikipedia.org/wiki/Gold_Runner) (formerly San Joaquins) track. So we manually added it from the USDOT arcgis.com souce listed above, splitting it into two tracks in the `traintracker.qgz` QGIS project. They share a trunk from Bakersfield and a spilt toward the terminus at either Oakland (OKJ) or Sacramento (SAC).

We then export each track as GeoJSON. Another issue: The underlying data is broken up as a MultiLineString with multiple segments despite being encodable as a single LineString. All the other track imported from GTFS data is LineStrings, which we rely on in `app/components/Map/calc.ts` for train extrapolation. So `flattenGeoJson.ts` in this directory transforms the MultiLineStrings to LineStrings to output the `*_flat.json` files. Note they are named with a `.json` extension so `gtfs-import.ts` can import them as JSON directly. Change this extension to `.geojson` to open in QGIS.

Arriving at the current algorithm to flatten was a process of trial and error. What ended up working for both tracks was sorting their line segment arrays' first points from west to east, then reversing the final segment which was backwards for some reason. This results in a single, contiguous, in-order LineString for each Gold Runner track trunk and and its branch.

# GIS data

Data in this directory is intended to be read and edited with a GIS application (like QGIS) to generate the exported GeoJSON files used by the frontend application. The files in this directory should not be used by the frontend application directly.

## Data sources

- Amtrak: https://content.amtrak.com/content/gtfs/GTFS.zip [via Transitland](https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle)
  - Supplemental data Gold Runner (formerly San Joaquins) track missing from Amtrak GTFS data: https://data-usdot.opendata.arcgis.com/datasets/amtrak-routes/explore. Details below.
- VIA Rail: https://www.viarail.ca/sites/all/files/gtfs/viarail.zip via [VIA Rail developer resources](https://www.viarail.ca/en/developer-resources)
- Brightline: http://feed.gobrightline.com/bl_gtfs.zip via [Transitland](https://www.transit.land/feeds/f-brightline~trails)

Note: Amtrak also [hosts GFTS data](https://content.amtrak.com/content/gtfs/GTFS.zip) found [via Transitland](https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle), but it seems a lot less "clean" than the USDOT data. The track is seemingly randomly split into over 100 sometimes very-small segments and is not nicely annotated per route like USDOT.

## Background

Originally, this directory was about processing track data from transit agencies, largely from GTFS data, to remove duplicate points (multiple layers of the same track) in order to achieve the most minimal file size. See commit a61d4cea2bd561638395a6467784d7937443db68 for these work-in-progress scripts.

Idea was to snap train to a track based only on its GPS location proximity. In practice, this didn't work very well because tracks split and merge, so they're not contiguous for a single train. On the other hand, GTFS data for all agencies have a shapes.txt that includes a dedicated rail LineString for each route ("trips.txt").

This worked much better for snapping trains to their specific routes, despite the heavier file size. The `app/lib/gtfs-import.ts` startup script imports GTFS rail line data from transit agencies and generates the equivalent GeoJSON.

Only issue is Amtrak's GTFS shapes.txt is missing the [Gold Runner](https://en.wikipedia.org/wiki/Gold_Runner#) (formerly San Joaquins) track. So I've manually added it from the USDOT arcgis.com souce listed above, splitting it into two tracks in `traintracker.qgz`. They share a trunk from Bakersfield and a spilt toward the terminus at either Oakland (OKJ) or Sacramento (SAC).

I then export each track as GeoJSON. Only issue: The underlying data is broken up as a MultiLineString with multiple segments despite being encodable as a single LineString. All the other track imported from GTFS data is LineStrings, which we rely on in `app/components/Map/calc.ts` for train extrapolation. So `flattenGeoJson.ts` in this directory transforms the MultiLineStrings to LineStrings.

Ending up at the current algorithm to flatten was a process of trial and error. What ended up working for both tracks was sorting their line segment arrays' first points from west to east, then reversing the final segment which was backwards. This results in a single, contiguous, in-order LineString.

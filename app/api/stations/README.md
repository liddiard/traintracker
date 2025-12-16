## Data sources

- `amtrak-stations.csv`: https://data-usdot.opendata.arcgis.com/datasets/amtrak-stations
- `amtrakStations.ts`: https://github.com/eiiot/amtraker-v3/blob/main/data/stations.ts

## Notes

Amtrak provides GTFS data at https://content.amtrak.com/content/gtfs/GTFS.zip, but it is not reliable. It includes a bunch of bus stops which are not straightforward to filter out, and it excludes dozens to hundreds of train stations. The US DOT dataset includes the missing stations and allows us to easily filter out bus stops.

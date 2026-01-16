# Data sources

## Amtrak

- `track.geojson`: https://catalog.data.gov/dataset/amtrak-routes1

Note: Previously also had file `amtrak-stations.geojson` here from https://catalog.data.gov/dataset/amtrak-stations2, but this dataset contained too many stations that are not actually used by Amtrak, and the names didn't match those used in the Amtraker API. Now using Amtraker API's `stations` endpoint instead of this data.gov file.

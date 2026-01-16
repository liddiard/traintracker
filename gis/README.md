# GIS data

Data in this directory is intended to be read and edited with a GIS application (like QGIS) to generate the exported GeoJSON files used by the frontend application. The files in this directory should not be used by the frontend application directly.

## Data sources

- Amtrak: https://data-usdot.opendata.arcgis.com/datasets/amtrak-routes/explore
- VIA Rail: https://www.viarail.ca/sites/all/files/gtfs/viarail.zip via [VIA Rail developer resources](https://www.viarail.ca/en/developer-resources)
- Brightline: http://feed.gobrightline.com/bl_gtfs.zip via [Transitland](https://www.transit.land/feeds/f-brightline~trails)

Note: Amtrak also [hosts GFTS data](https://content.amtrak.com/content/gtfs/GTFS.zip) found [via Transitland](https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle), but it seems a lot less "clean" than the USDOT data. The track is seemingly randomly split into over 100 sometimes very-small segments and is not nicely annotated per route like USDOT.

## Data processing (QGIS)

### Import

1. Rename GTFS "shapes.txt" files to "shapes.csv"
2. Install [MMQGIS plugin](https://plugins.qgis.org/plugins/mmqgis/)
3. MMQGIS -> Import/Export -> Geometry Import from CSV File
4. Set "shapes.csv" as import file
5. Geometry type = MultiLineString
6. Shape ID field = `shape_id`
7. Part ID field = `shape_id` (⚠️ unintuitive selection – `shape_pt_sequence` doesn't work for some reason)
8. Latitude field & Longitude field = (auto-detected)
9. Press "Apply"

### Exact duplicate removal

Both Amtrak and VIA Rail have many duplicate tracks in their data, where "duplicate" here means tracks with the exact same coordinates.

To detect and remove these duplicates:

1. Select the layer from which to remove duplicates
2. Go to View -> Panels -> (Open) Processing Toolbox
3. Search "Delete duplicate geometries" and double click the result

Note: This appears to work better (remove more duplicates) than using MMQGIS. Leaving its steps here for reference: Select layer -> MMQGIS -> Modify -> Delete Duplicate Geometries.

Brightline data also has a duplicate track (there are only 2 in total as of writing), which can easily be removed manually: Right-click layer -> Open Attribute Table -> Toggle editing mode -> Right click the duplicate feature -> Delete Feature.

### Converging branch duplicate removal

Both Amtrak and VIA Rail have track branches that converge and become overlapping, leading to unnecessary geometry which can break the Next.js app's train snapping / extrapolation along a track. We must manually cull the overlapping geometry from these tracks.

## GeoJSON export

Layer panel -> Right click -> Export -> Save Features As...

**Export settings:**

- Format: GeoJSON
- Under "Select fields to export...", Deselect All
- Deselect "Persist layer metadata"
- COORDINATE_PRECISION = 6 (11.1 cm accuracy – [source](https://support.garmin.com/en-US/?faq=hRMBoCTy5a7HqVkxukhHd8))

When served over the wire with Brotli compression, this can get the Amtrak track data transferred down to ~500KB.

import { FeatureCollection } from 'geojson'

declare global {
  declare module 'public/map_data/track.json' {
    const content: FeatureCollection
    export default content
  }
}

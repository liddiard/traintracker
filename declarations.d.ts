import { FeatureCollection } from 'geojson'

declare global {
  declare module '*.geojson' {
    const content: FeatureCollection
    export default content
  }
}

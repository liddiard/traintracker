"use client";

import { useEffect } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import "./MapLegend";

function Map() {
  useEffect(() => {
    new maplibregl.Map({
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [-73.986, 40.755],
      zoom: 10,
      container: "map",
    });
  }, []);

  return (
    <>
      <div id="map" className="h-full" />
      {/* <MapLegend /> */}
    </>
  );
}

export default Map;

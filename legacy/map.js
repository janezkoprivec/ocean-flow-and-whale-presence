// src/map.js
import { state, onStateChange } from "./state.js";

let map = null;
let whaleSourceId = "whales";

/**
 * Inicializira MapLibre map (globe že inicializira globe.js)
 */
export function initMap(mapInstance) {
  map = mapInstance;

  if (!map) {
    console.error("❌ initMap: map instance missing");
    return;
  }

  map.on("load", () => {
    // dodaj prazen source za whale podatke
    if (!map.getSource(whaleSourceId)) {
      map.addSource(whaleSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });

      map.addLayer({
        id: "whales",
        type: "circle",
        source: whaleSourceId,
        paint: {
          "circle-radius": 3,
          "circle-color": "#ffffff",
          "circle-opacity": 0.8
        }
      });
    }
  });

  // ob spremembi state → update
  onStateChange(() => {
    updateMap();
  });
}

/**
 * Naloži whale GeoJSON glede na izbran range
 */
export async function loadWhales(range) {
  const url =
    range === "2010_2013"
      ? "data/whales_2010_2013.geojson"
      : "data/whales_2011_2012.geojson";

  const res = await fetch(url);
  return await res.json();
}

/**
 * Posodobi whale sloj glede na state
 */
export function updateMap(geojson) {
  if (!map || !map.isStyleLoaded()) return;
  if (!map.getSource(whaleSourceId)) return;

  if (!state.showWhales) {
    map.setLayoutProperty("whales", "visibility", "none");
    return;
  }

  map.setLayoutProperty("whales", "visibility", "visible");

  if (geojson) {
    map.getSource(whaleSourceId).setData(geojson);
  }
}

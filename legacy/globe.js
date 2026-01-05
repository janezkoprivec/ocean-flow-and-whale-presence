// src/globe.js
import { state, onStateChange } from "./state.js";
import { loadCurrents } from "./currents.js";

let map = null;
let currentsData = null;

/**
 * Inicializira 3D globe (MapTiler / MapLibre)
 */
export async function initGlobe({
  containerId = "map",
  center = [0, 45],
  zoom = 1.8
} = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("❌ Globe container not found:", containerId);
    return;
  }

  // Ensure MapTiler SDK is loaded and available
  if (typeof window.maptilersdk === "undefined") {
    console.error("❌ MapTiler SDK not loaded");
    return;
  }

  // Set API key if not already set
  if (!window.maptilersdk.config.apiKey) {
    window.maptilersdk.config.apiKey = "j72DJvKfg99jStOjT7xE";
  }

  // Try to use globe projection, fallback to 2D if not supported
  let projection = "globe";
  try {
    // Test if globe projection is supported
    if (!window.maptilersdk.Map.prototype.setProjection) {
      projection = "mercator";
    }
  } catch (e) {
    projection = "mercator";
  }

  const map = new window.maptilersdk.Map({
    container,
    style: window.maptilersdk.MapStyle.DATAVIZ.DARK,
    center,
    zoom,
    projection,
    pitch: projection === "globe" ? 35 : 0,
    bearing: 0,
    antialias: true
  });

  window.map = map; // Expose for other scripts

  map.on("load", () => {
    if (projection === "globe") {
      map.setFog({
        range: [-1, 2],
        color: "#0b1020",
        "horizon-blend": 0.2,
        "space-color": "#000000",
        "star-intensity": 0.15
      });
    }
    // You can add more globe/map logic here if needed
    console.log("🌍 Globe or map loaded");
  });

  // ob vsaki spremembi state → update
  onStateChange(() => {
    renderCurrents();
  });

  // Expose map for debugging or external use
  window.map = map;
}

/**
 * Izriše vertical flow (w) kot kroge
 * (preprosto, stabilno, dovolj za IOI)
 */
function renderCurrents() {
  if (!map || !map.isStyleLoaded() || !currentsData) return;
  if (!state.showCurrents) {
    if (map.getLayer("currents")) map.removeLayer("currents");
    if (map.getSource("currents")) map.removeSource("currents");
    return;
  }

  const pts = currentsData.getCurrentStep();
  if (!pts || !pts.length) return;

  const geojson = {
    type: "FeatureCollection",
    features: pts.map(p => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [p.lon, p.lat]
      },
      properties: {
        w: p.w
      }
    }))
  };

  if (map.getSource("currents")) {
    map.getSource("currents").setData(geojson);
    return;
  }

  map.addSource("currents", {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: "currents",
    type: "circle",
    source: "currents",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["abs", ["get", "w"]],
        0, 2,
        0.02, 6,
        0.05, 12
      ],
      "circle-color": [
        "case",
        [">=", ["get", "w"], 0],
        "#4aa8ff",   // upwelling
        "#ff6b6b"    // downwelling
      ],
      "circle-opacity": 0.6
    }
  });
}

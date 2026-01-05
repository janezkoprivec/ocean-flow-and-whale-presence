import { initGlobe } from "./globe.js";
import { initSpeciesChart } from "./charts_species.js";
import { initSeasonality } from "./charts_seasonality.js";
import { state, setState } from "./state.js";
import { initMap, loadWhales, updateMap } from "./map.js";

let whalesGeojson = null;

function updateAll() {
  // Filter whales by state
  if (!whalesGeojson) return;
  const filtered = {
    ...whalesGeojson,
    features: whalesGeojson.features.filter(f => {
      const p = f.properties || {};
      // Range filter
      let inRange = true;
      if (state.range === "2011_2012") inRange = (p.year >= 2011 && p.year <= 2012);
      if (state.range === "2010_2013") inRange = (p.year >= 2010 && p.year <= 2013);
      // Species filter
      let speciesMatch = state.species === "All" || [p.species, p.species_name, p.spec, p.scientificName, p.commonName].includes(state.species);
      // Month filter
      let monthMatch = true;
      if (typeof p.year === "number" && typeof p.month === "number") {
        const idx = (p.year - 2011) * 12 + (p.month - 1);
        monthMatch = Math.abs(idx - state.monthIndex) <= 1;
      }
      return inRange && speciesMatch && monthMatch;
    })
  };
  updateMap(filtered);
}

function populateSpeciesDropdown(features) {
  const sel = document.getElementById("speciesSelect");
  if (!sel) return;
  const speciesSet = new Set();
  features.forEach(f => {
    const p = f.properties;
    const s = p && (p.species || p.species_name || p.spec || p.scientificName || p.commonName);
    if (s) speciesSet.add(String(s));
  });
  sel.innerHTML = '<option value="All">All species</option>';
  Array.from(speciesSet).sort().forEach(sp => {
    const opt = document.createElement("option");
    opt.value = sp;
    opt.textContent = sp;
    sel.appendChild(opt);
  });
}

function formatMonth(i) {
  const y = 2011 + Math.floor(i / 12);
  const m = (i % 12) + 1;
  return `${y}-${m.toString().padStart(2, "0")}`;
}

function initUI() {
  // Range
  document.getElementById("rangeSelect")?.addEventListener("change", e => {
    setState({ range: e.target.value });
    loadWhalesAndUpdate();
  });
  // Species
  document.getElementById("speciesSelect")?.addEventListener("change", e => {
    setState({ species: e.target.value });
    updateAll();
  });
  // Time slider
  const timeSlider = document.getElementById("timeSlider");
  const timeLabel = document.getElementById("timeLabel");
  timeSlider?.addEventListener("input", e => {
    const idx = +e.target.value;
    setState({ monthIndex: idx });
    if (timeLabel) timeLabel.textContent = formatMonth(idx);
    updateAll();
  });
  // Layer toggles
  document.getElementById("whalesToggle")?.addEventListener("change", e => {
    setState({ showWhales: e.target.checked });
    updateAll();
  });
  document.getElementById("currentsToggle")?.addEventListener("change", e => {
    setState({ showCurrents: e.target.checked });
  });
  // Play button
  const playBtn = document.getElementById("playBtn");
  let playInterval = null;
  let playing = false;
  playBtn?.addEventListener("click", () => {
    if (!playing) {
      playing = true;
      playBtn.textContent = "Pause";
      playInterval = setInterval(() => {
        const nextIndex = (state.monthIndex + 1) % 24;
        setState({ monthIndex: nextIndex });
        if (timeSlider) timeSlider.value = nextIndex;
        if (timeLabel) timeLabel.textContent = formatMonth(nextIndex);
        updateAll();
      }, 1000);
    } else {
      playing = false;
      playBtn.textContent = "Play";
      clearInterval(playInterval);
    }
  });
  // Bookmarks (optional: implement camera movement)
  document.querySelectorAll("button[data-bm]").forEach(btn => {
    btn.addEventListener("click", () => {
      // Implement camera movement if desired
    });
  });
  // Set initial label
  if (timeSlider && timeLabel) {
    timeLabel.textContent = formatMonth(+timeSlider.value);
  }
}

async function loadWhalesAndUpdate() {
  whalesGeojson = await loadWhales(state.range);
  populateSpeciesDropdown(whalesGeojson.features);
  updateAll();
}

async function main() {
  // Init globe/map
  await initGlobe({ containerId: "map" });
  initMap(window.map);
  // Init UI
  initUI();
  // Init charts
  initSpeciesChart("speciesChart");
  initSeasonality("seasonality");
  // Load data
  await loadWhalesAndUpdate();
}

main();
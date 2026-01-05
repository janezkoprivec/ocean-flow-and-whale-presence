// src/charts_species.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { state, onStateChange } from "./state.js";

let allFeatures = [];

/**
 * Inicializira bar chart top vrst (scientificName)
 */
export function initSpeciesChart(
  containerId = "speciesChart",
  dataUrl = "data/whales_2011_2012.geojson"
) {
  d3.json(dataUrl).then(geo => {
    allFeatures = geo.features || [];
    updateChart(containerId);

    // poslušaj spremembe state
    onStateChange(() => {
      updateChart(containerId);
    });
  });
}

function updateChart(containerId) {
  const filtered = allFeatures.filter(f => {
    if (!state.showWhales) return false;

    if (state.range === "2011_2012") {
      const y = Number(f.properties.year);
      const m = Number(f.properties.month);
      const idx = (y - 2011) * 12 + (m - 1);
      if (Math.abs(idx - state.monthIndex) > 1) return false;
    }

    if (state.species !== "All") {
      return f.properties.scientificName === state.species;
    }

    return true;
  });

  const counts = d3.rollups(
    filtered,
    v => v.length,
    d => d.properties.scientificName || "Unknown"
  )
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => d3.descending(a.count, b.count))
    .slice(0, 10);

  draw(containerId, counts);
}

function draw(containerId, data) {
  const sel = d3.select(`#${containerId}`);
  sel.selectAll("*").remove();

  const width = 360;
  const height = 200;
  const margin = { top: 10, right: 10, bottom: 30, left: 140 };

  const svg = sel.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%");

  const y = d3.scaleBand()
    .domain(data.map(d => d.species))
    .range([margin.top, height - margin.bottom])
    .padding(0.15);

  const x = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count) || 1])
    .nice()
    .range([margin.left, width - margin.right]);

  svg.append("g")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", x(0))
    .attr("y", d => y(d.species))
    .attr("width", d => x(d.count) - x(0))
    .attr("height", y.bandwidth())
    .attr("fill", "#77c5f7");

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(4))
    .call(g => g.select(".domain").remove());

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y))
    .call(g => g.select(".domain").remove());
}

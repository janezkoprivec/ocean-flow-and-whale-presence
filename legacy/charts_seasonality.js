// src/charts_seasonality.js
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import { state, onStateChange } from "./state.js";

/**
 * Inicializira graf sezonskosti (število opazovanj po mesecih)
 * @param {string} containerId - ID HTML elementa za graf
 * @param {string} csvPath - Pot do CSV datoteke z mesečnimi podatki
 */
export function initSeasonality(containerId = "seasonality", csvPath = "data/whales_monthly_counts.csv") {
  d3.csv(csvPath, d3.autoType).then(data => {
    // Sortiraj po času
    data.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

    // Transformiraj v mesečni indeks
    data.forEach(d => d.monthIndex = (d.year - 2011) * 12 + (d.month - 1));

    drawChart(containerId, data);

    onStateChange(() => {
      updateHighlight(data);
    });
  });
}

/**
 * Nariše vrstični graf z d3
 */
function drawChart(containerId, data) {
  const sel = d3.select(`#${containerId}`);
  sel.selectAll("*").remove();

  const width = 360;
  const height = 180;
  const margin = { top: 10, right: 10, bottom: 30, left: 40 };

  const svg = sel.append("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", "100%");

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.monthIndex))
    .range([margin.left, width - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)]).nice()
    .range([height - margin.bottom, margin.top]);

  const line = d3.line()
    .x(d => x(d.monthIndex))
    .y(d => y(d.count));

  svg.append("path")
    .datum(data)
    .attr("fill", "none")
    .attr("stroke", "#4ca0e0")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(i => {
      const y = Math.floor(i / 12) + 2011;
      const m = (i % 12) + 1;
      return `${y}-${String(m).padStart(2, "0")}`;
    }))
    .selectAll("text")
    .style("font-size", "8px")
    .style("text-anchor", "end")
    .attr("transform", "rotate(-30)");

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(4));

  svg.append("line")
    .attr("id", "monthMarker")
    .attr("stroke", "red")
    .attr("stroke-width", 1)
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom);
}

/**
 * Posodobi rdečo črto, ki označuje trenutni mesec (state.monthIndex)
 */
function updateHighlight(data) {
  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.monthIndex))
    .range([40, 360 - 10]); // left, right margine

  d3.select("#monthMarker")
    .attr("x1", x(state.monthIndex))
    .attr("x2", x(state.monthIndex));
}

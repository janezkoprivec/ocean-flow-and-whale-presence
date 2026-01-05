// src/currents.js
import { state, onStateChange } from "./state.js";

/**
 * Naloži ECCO vertical flow (w) JSON
 * Vrne objekt z metodo getCurrentStep()
 */
export async function loadCurrents(url = "data/vertical_flow_w_surface.json") {
  const res = await fetch(url);
  const json = await res.json();

  const steps = json.steps || [];
  const labels = json.labels || [];

  function getCurrentStep() {
    const idx = Math.max(0, Math.min(steps.length - 1, state.monthIndex));
    return steps[idx];
  }

  return {
    steps,
    labels,
    getCurrentStep
  };
}

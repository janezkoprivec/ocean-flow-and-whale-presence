// src/state.js

// Centralni globalni state aplikacije
export const state = {
  range: "2011_2012",
  species: "All",
  monthIndex: 0,
  showWhales: true,
  showCurrents: true,
  playing: false
};

// Interni seznam listenerjev
const listeners = [];

/**
 * Pokliči, ko se state spremeni
 * @param {Function} fn
 */
export function onStateChange(fn) {
  listeners.push(fn);
}

/**
 * Posodobi state in obvesti vse listenerje
 * @param {Object} patch
 */
export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach(fn => fn(state));
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ocean visualization dashboard showing whale presence data, ocean currents (vertical flow), and related oceanographic metrics. Built with React, Mantine UI, and MapTiler SDK for interactive globe/map visualization.

## Commands

```bash
yarn dev        # Start development server
yarn build      # Type-check and build for production
yarn typecheck  # Run TypeScript type checking only
yarn preview    # Preview production build
```

## Architecture

### Frontend (`src/`)

- **App.tsx**: Main application component containing:
  - MapTiler globe visualization with whale sighting points and current flow overlays
  - Time slider for monthly animation (2011-2012 data aligned with ECCO ocean model)
  - Species filtering and dataset range selection
  - Charts for seasonality and species distribution using Mantine Charts/Recharts

- **Components** (`src/components/`): Placeholder components for additional visualizations:
  - WhaleGuessingGame, WhalePresenceGame - interactive quiz/game components
  - WhalesSalinityTemp - salinity and temperature correlation views
  - StatsBySpecies - per-species statistics
  - ExploreTheOceans - regional ocean browsing

### Data (`data/`)

Preprocessed datasets for visualization. See `data/DATA_USAGE_README.md` for detailed schema documentation.

- **whales_2011_2012.geojson / whales_2010_2013.geojson**: GeoJSON whale sighting data from OBIS
- **whales_2011_top3_by_species_month.json**: Hierarchical data (species → month → centroid, occurrences, mean temp/salinity)
- **whales_2011_top3_all_occurances.json**: Flat array of top 3 whale species occurrences
- **whales_2011_by_region.json**: Occurrences organized by geographic region (Europe, North Atlantic)
- **vertical_flow_w_surface.json**: Monthly ocean vertical flow (w) data for current visualization
- **preprocessing.ipynb**: Jupyter notebook for data preparation (fetching mean salinity/temperature takes ~80 min)

### Legacy (`legacy/`)

Original vanilla JavaScript implementation before React migration. Contains modular JS files (globe.js, map.js, charts_*.js) and standalone HTML.

## Key Technical Details

- MapTiler API key via `VITE_MAPTILER_KEY` env var (has fallback default)
- Whale data uses multiple property names for species (`species`, `species_name`, `scientificName`, etc.) - helper function `getSpeciesName()` handles this
- Time index is 0-23 representing Jan 2011 through Dec 2012
- Current flow data: positive w = upwelling (blue), negative w = downwelling (red)

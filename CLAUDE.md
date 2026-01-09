# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ocean visualization dashboard showing whale presence data, ocean currents (vertical flow), and related oceanographic metrics. Built with React, Mantine UI, and MapTiler SDK for interactive globe/map visualization.

## Current Status

**Last Updated**: 2026-01-09
**Status**: Active Development

### Working Features
- MapTiler globe visualization with whale sighting points
- Ocean vertical flow (upwelling/downwelling) visualization overlay
- Time slider for monthly animation (2011-2012 data, 24 months)
- Species filtering for whale data
- Dataset range selection (2010-2013 vs 2011-2012)
- Data preprocessing pipeline (Jupyter notebook)
- Seasonality and species distribution charts (Mantine Charts/Recharts)
- Three preprocessed datasets:
  - All occurrences for top 3 species
  - Data aggregated by species and month
  - Regional grouping (Europe, North Atlantic)

### In Progress
- Temperature and salinity visualization by species/month in preprocessing notebook

### Next Steps
- Implement placeholder components (WhalesSalinityTemp, StatsBySpecies, etc.)
- Add interactive features to visualization

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
- Vite proxy configured to forward `/api/*` to `http://127.0.0.1:8000` for local development

## Session History (Summary)

### Session 2026-01-09 - Initial CLAUDE.md & Notebook Plotting

**Changes**:
- Created `CLAUDE.md` with project architecture guide
- Added matplotlib plotting cells to `data/preprocessing.ipynb` for temperature/salinity visualization by species and month
- Fixed git divergence using `git pull --rebase origin master`
- Enhanced `CLAUDE.md` with session state tracking and issue management structure

**Discoveries**:
- Project uses three whale species: Balaenoptera physalus, Balaenoptera acutorostrata, Megaptera novaeangliae
- Data fetching for mean temp/salinity takes ~80 min via local server
- Month indexing: 0-11 in Python preprocessing code, 1-12 for API time parameter
- Temperature/salinity data returned as dict with 'mean' key from API

**Issues Encountered**:
- Git branch divergence (see Resolved Issues)

## Known Issues

### Active Issues

(No active issues currently)

### Resolved Issues

#### Issue: Git Branch Divergence
- **Status**: Resolved (2026-01-09)
- **Problem**: Local `master` and `origin/master` diverged (2 local commits, 1 remote commit)
- **Solution**: Used `git pull --rebase origin master` to rebase local commits on top of remote changes
- **Lessons Learned**: Rebase is cleaner than merge for keeping linear history when local/remote diverge
- **Related Files**: N/A (git workflow issue)

## Learnings & Patterns

### Code Patterns to Follow
- **Species name extraction**: Use helper function `getSpeciesName()` due to multiple property name variations across data sources
- **Matplotlib species colors**: Use consistent color scheme for species across all visualizations
  - Balaenoptera physalus: `#1f77b4` (blue)
  - Balaenoptera acutorostrata: `#ff7f0e` (orange)
  - Megaptera novaeangliae: `#2ca02c` (green)
- **Month names**: Use the standardized lowercase `month_names` array rather than hardcoding

### Things to Avoid
- **Don't run preprocessing step 2** (mean salinity/temperature fetching) unless necessary - takes ~80 minutes for full dataset
- **Avoid large spatial margins**: Use margin=1 degree (not 5) in API calls to avoid too-large spatial squares for mean computation
- **Don't hardcode month strings**: Use the month_names array for consistency between Python (0-11) and API (1-12) indexing

### Technical Discoveries
- Species property names vary across datasets: `species`, `species_name`, `scientificName` - need flexible accessor
- Time indexing: 0-23 represents Jan 2011 through Dec 2012 (24 months total)
- Vertical flow convention: positive w = upwelling (blue), negative w = downwelling (red)
- API response format: Mean temperature/salinity returned as `{"mean": float, "points_processed": int, "total_points": int}`
- Vite dev proxy: Configured in `vite.config.ts` to forward `/api/*` to local backend at `http://127.0.0.1:8000`

## Development Notes

### Data Pipeline Notes
- **Local backend required**: Computing mean salinity/temperature requires local server (ioi-project-backend project)
- **Server command**: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
- **Data fetching duration**: ~80 min for all species/months (327 whale occurrences × 2 variables × margin computation)
- **API margin parameter**: Use 1 degree for spatial square around each point (not 5 - too large)
- **Month conversion**: Python uses 0-11 for month indexing, but API expects 1-12 in time parameter (YYYY-MM-DD)

### Common Problems & Solutions

- **Problem**: Need to compute mean temperature/salinity for whale occurrence coordinates
  - **Solution**:
    1. Run local backend server: `uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`
    2. Use `fetch_mean_from_server()` helper function in `preprocessing.ipynb`
    3. Pass coordinates as list of `{"lon": float, "lat": float}` dicts
    4. Use `variable="thetao"` for temperature, `variable="so"` for salinity

- **Problem**: Accessing mean values from API response
  - **Solution**: API returns dict with structure `{"mean": value, "points_processed": count, "total_points": count}` - access via `response["mean"]`

### Troubleshooting

- **CORS issues with API**: Use Vite proxy configuration (already set up in `vite.config.ts`)
- **Long preprocessing time**: Step 2 of preprocessing (fetching mean temp/salinity) takes ~80 min - only run when dataset changes
- **Missing species names**: Check multiple property fields using `getSpeciesName()` helper function

### Performance Considerations
- Preprocessing step 2 (mean salinity/temperature) is computationally expensive (~80 min)
- Spatial margin in API calls affects computation time - use smallest practical margin (1 degree)
- Stride/decimation in data processing affects file size vs detail trade-off

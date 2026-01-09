# Data Usage Documentation

## whales_2011_top3_all_occurances.json

This file contains all occurrences of the top 3 whale species in a single array. The dataset is used in the visualization when all occurrences need to be shown at the same time.

## whales_2011_top3_by_species_month.json

This file is used for the visualization where users can select a species they want to follow. The data is organized hierarchically by species and then by month. When computing mean value of temperature, +-1.0 degree was used for boundry box around the center (lat,lon) point of the whale. Using a larger value results in too broad of an area, and using too small of a value can cause noise to affect the reading of temperature for each whale.

### Structure

The JSON structure is organized as follows:
- **Top level**: Species names (e.g., "Balaenoptera acutorostrata", "Balaenoptera physalus", "Megaptera novaeangliae")
- **Second level**: Months (january, february, march, ..., december)
- **Month level**: Contains the following data:
  - `centroid`: An object with `lon` and `lat` (float32) representing the mean location of all whale occurrences for that species in that month. This is used to center the camera in the middle of all occurrences. **Note**: Can be `null` if there are no occurrences for that month.
  - `occurences`: An array of objects, each containing `lon` and `lat` (float32) coordinates. This array contains one entry for each occurrence of the species in that month and is used to plot the whale locations.
  - `mean_temperature`: An object containing:
    - `mean`: float32 - Mean temperature value for the occurrences in that month
    - `points_processed`: int - Number of coordinate points that were successfully processed
    - `total_points`: int - Total number of coordinate points submitted
    Used for graphs in the visualization. **Note**: Can be `null` if there are no occurrences for that month.
  - `mean_salinity`: An object containing:
    - `mean`: float32 - Mean salinity value for the occurrences in that month
    - `points_processed`: int - Number of coordinate points that were successfully processed
    - `total_points`: int - Total number of coordinate points submitted
    Used for graphs in the visualization. **Note**: Can be `null` if there are no occurrences for that month.

### Usage

After selecting a species to follow, the visualization can query by month to:
1. Retrieve the `centroid` to center the camera on all occurrences for that month
2. Plot all `occurences` for that species and month
3. Display `mean_temperature.mean` and `mean_salinity.mean` in graphs

### Special Cases

In 5 cases, there were no occurrences for certain months, resulting in `null` values for `centroid`, `mean_temperature`, and `mean_salinity`:
- **Balaenoptera physalus**: january, february, march
- **Balaenoptera acutorostrata**: january, february

### Example Structure

```json
{
  "Balaenoptera acutorostrata": {
    "january": {
      "centroid": null,
      "occurences": [],
      "mean_temperature": null,
      "mean_salinity": null
    },
    "february": {
      "centroid": {
        "lon": 14.1004255,
        "lat": 54.424407
      },
      "occurences": [
        {"lon": 12.070851, "lat": 39.698814},
        {"lon": 16.13, "lat": 69.15}
      ],
      "mean_temperature": {
        "mean": 9.519434772512835,
        "points_processed": 2,
        "total_points": 2
      },
      "mean_salinity": {
        "mean": 36.27052139476607,
        "points_processed": 2,
        "total_points": 2
      }
    },
    // ... other months
  },
  "Balaenoptera physalus": {
    // same structure as above
    // Note: january, february, march have null values for centroid, mean_temperature, and mean_salinity
  },
  "Megaptera novaeangliae": {
    // same structure as above
  }
}
```

## whales_2011_by_region.json

This file contains whale occurrences from 2011 organized by geographic region (ocean). The dataset is used in the visualization when displaying whales based on the ocean they are in.

### Structure

The JSON structure is organized by region:
- **Top level**: Region names ("Europe" and "North_Atlantic")
- **Second level**: Arrays of whale occurrence objects
- **Occurrence objects**: Each object contains:
  - `scientificName`: string - The scientific name of the whale species
  - `year`: int - The year of the occurrence (2011)
  - `month`: int - The month of the occurrence (1-12)
  - `day`: int - The day of the occurrence (1-31)

### Regional Boundaries

- **Europe**: 
  - Latitude: 29° to 72°
  - Longitude: -15° to 45°
  
- **North Atlantic**: 
  - Latitude: 30° to 75°
  - Longitude: -80° to 20°

### Usage

This dataset is used in visualizations where whales are filtered and displayed based on the ocean/region they were spotted in. The regional boundaries are defined by the latitude and longitude coordinates of each whale occurrence.

### Example Structure

```json
{
  "Europe": [
    {
      "scientificName": "Tursiops truncatus",
      "year": 2011,
      "month": 7,
      "day": 29
    },
    // ... more whale occurrences in Europe
  ],
  "North_Atlantic": [
    {
      "scientificName": "Balaenoptera physalus",
      "year": 2011,
      "month": 9,
      "day": 8
    },
    // ... more whale occurrences in North Atlantic
  ]
}
```
## species_stats_2011_merged.json

This file summarizes cetacean species observed in 2011 by aggregating whale and dolphin occurrences based on their scientific names. Each entry represents a single species and includes its scientific name, common name, total number of sightings, and a short descriptive text.

The dataset can be searched by either scientific name or common species name to retrieve occurrence statistics and descriptive information. It is intended for use in visualizations and interactive features that explore cetacean presence patterns.

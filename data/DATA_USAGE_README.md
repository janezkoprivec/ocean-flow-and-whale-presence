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
  - `lon`: float32 - The longitude coordinate of the whale occurrence
  - `lat`: float32 - The latitude coordinate of the whale occurrence

### Regional Boundaries

- **Europe**: 
  - Latitude: 29° to 72°
  - Longitude: -15° to 45°
  
- **North Atlantic**: 
  - Latitude: 30° to 75°
  - Longitude: -80° to 20°

### Usage

This dataset is used in visualizations where whales are filtered and displayed based on the ocean/region they were spotted in. The regional boundaries are defined by the latitude and longitude coordinates of each whale occurrence. The `lat` and `lon` fields in each occurrence object can be used to visualize whale locations on a map.

### Example Structure

```json
{
  "Europe": [
    {
      "scientificName": "Tursiops truncatus",
      "year": 2011,
      "month": 7,
      "day": 29,
      "lon": -1.8803,
      "lat": 48.70619
    },
    // ... more whale occurrences in Europe
  ],
  "North_Atlantic": [
    {
      "scientificName": "Balaenoptera physalus",
      "year": 2011,
      "month": 9,
      "day": 8,
      "lon": -45.1234,
      "lat": 55.6789
    },
    // ... more whale occurrences in North Atlantic
  ]
}
```

## europe_world_monthly_temperature_salinity.json

This file contains monthly average temperature and salinity data for the year 2011, organized by geographic region (world and Europe). The dataset provides baseline environmental conditions that can be compared against whale-specific temperature and salinity measurements to understand how whale presence relates to oceanographic conditions.

### Structure

The JSON structure is organized by month:
- **Top level**: Month names (january, february, march, ..., december)
- **Second level**: Region names ("world" and "europe")
- **Region level**: Contains the following data:
  - `mean_temperature`: float32 - Mean sea surface temperature (°C) for the region in that month
  - `mean_salinity`: float32 - Mean sea surface salinity (PSU) for the region in that month

### Regional Boundaries

- **World**: 
  - Latitude: -90° to 90° (global coverage)
  - Longitude: -180° to 180° (global coverage)
  - Data fetched with stride 8 for computational efficiency
  
- **Europe**: 
  - Latitude: 29° to 72°
  - Longitude: -15° to 45°
  - Data fetched with stride 4 for computational efficiency

### Data Processing

The data was computed by:
1. Fetching oceanographic data from the ECCO dataset via API calls
2. Using spatial subsetting with specified strides to manage data volume
3. Computing mean values across all valid data points within each region for each month
4. Aggregating temperature (variable: "thetao") and salinity (variable: "so") at depth 0 (sea surface)

### Usage

This dataset is used in visualizations to:
1. Display baseline environmental conditions for comparison with whale-specific measurements
2. Show seasonal trends in temperature and salinity across different regions
3. Provide context for understanding whale distribution patterns relative to oceanographic conditions
4. Enable comparative analysis between global and European regional conditions

### Example Structure

```json
{
  "january": {
    "world": {
      "mean_temperature": 13.850968394800013,
      "mean_salinity": 34.125955736613996
    },
    "europe": {
      "mean_temperature": 9.36508910197064,
      "mean_salinity": 33.27258990778585
    }
  },
  "february": {
    "world": {
      "mean_temperature": 14.003757343233346,
      "mean_salinity": 34.16440189317247
    },
    "europe": {
      "mean_temperature": 8.880961204850307,
      "mean_salinity": 33.266346837357624
    }
  },
  // ... other months through december
}
```

## whales_2011_monthly_centroids.json

This file contains monthly centroid coordinates (mean latitude and longitude) aggregated from all whale occurrences in the `df_2011_filtered` dataset for the year 2011. The dataset provides a single representative location point for each month, calculated as the mean of all whale occurrence coordinates for that month. This is useful for visualizing the general geographic distribution trend of whale sightings throughout the year.

### Structure

The JSON structure is organized by month:
- **Top level**: Month names (january, february, march, ..., december)
- **Month level**: Contains the following data:
  - `lat`: float32 - Mean latitude coordinate of all whale occurrences for that month. **Note**: Can be `null` (represented as the string "null" in JSON, which is equivalent to NaN) if there are no occurrences for that month.
  - `lon`: float32 - Mean longitude coordinate of all whale occurrences for that month. **Note**: Can be `null` (represented as the string "null" in JSON, which is equivalent to NaN) if there are no occurrences for that month.

### Data Processing

The centroids are computed by:
1. Filtering the `df_2011_filtered` dataset (which contains the top 3 whale species: Balaenoptera acutorostrata, Balaenoptera physalus, and Megaptera novaeangliae)
2. Grouping all occurrences by month
3. Calculating the arithmetic mean of all latitude and longitude coordinates for each month

### Usage

This dataset is used in visualizations to:
1. Display the general geographic center of whale activity for each month
2. Show seasonal migration patterns through centroid movement
3. Provide a single representative point for camera positioning or map centering per month

### Special Cases

- **January**: There are no datapoints for January, so both `lat` and `lon` are set to `null` (represented as the string "null" in JSON, which is equivalent to NaN).

### Example Structure

```json
{
  "january": {
    "lat": "null",
    "lon": "null"
  },
  "february": {
    "lat": 59.943217833333335,
    "lon": 4.342177833333333
  },
  "march": {
    "lat": 66.804952,
    "lon": 14.101423999999998
  },
  // ... other months through december
}
```

## species_stats_2011_merged.json

This file summarizes cetacean species observed in 2011 by aggregating whale and dolphin occurrences based on their scientific names. Each entry represents a single species and includes its scientific name, common name, total number of sightings, and a short descriptive text.

The dataset can be searched by either scientific name or common species name to retrieve occurrence statistics and descriptive information. It is intended for use in visualizations and interactive features that explore cetacean presence patterns.

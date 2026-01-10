import { useEffect, useMemo, useRef, useState } from "react";
import { Paper, Stack, Text, Title, Select, MultiSelect, SimpleGrid, Badge, Group } from "@mantine/core";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import * as maptilersdk from "@maptiler/sdk";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "j72DJvKfg99jStOjT7xE";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Generate a consistent, distinct color for each species using HSL
function getSpeciesColor(speciesName: string): string {
  // Create a hash from the species name
  const hash = speciesName.split("").reduce((acc, char) => {
    const charCode = char.charCodeAt(0);
    return ((acc << 5) - acc) + charCode;
  }, 0);
  
  // Use the hash to generate HSL values
  // Hue: 0-360 (full color spectrum)
  // Saturation: 60-90% (vibrant but not too saturated)
  // Lightness: 45-65% (visible but not too dark/light)
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash >> 8) % 30); // 60-90%
  const lightness = 45 + (Math.abs(hash >> 16) % 20); // 45-65%
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

type WhaleOccurrence = {
  scientificName: string;
  year: number;
  month: number;
  day: number;
  lon: number;
  lat: number;
};

type RegionData = {
  Europe: WhaleOccurrence[];
  North_Atlantic: WhaleOccurrence[];
};

export default function WhalePresence() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const mapReadyRef = useRef(false);
  const multiSelectRef = useRef<HTMLInputElement | null>(null);
  const popupRef = useRef<maptilersdk.Popup | null>(null);

  const [regionData, setRegionData] = useState<RegionData | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>("Europe");
  const [selectedSpecies, setSelectedSpecies] = useState<string[]>([]);

  // Load data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/data/whales_2011_by_region.json");
        const data: RegionData = await res.json();
        if (!cancelled) {
          setRegionData(data);
        }
      } catch (error) {
        console.error("Failed to load whale data:", error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Extract available species for selected region
  const availableSpecies = useMemo(() => {
    if (!regionData || !selectedRegion) return [];
    const regionKey = selectedRegion === "North Atlantic" ? "North_Atlantic" : selectedRegion;
    const data = regionData[regionKey as keyof RegionData];
    if (!data) return [];
    
    const speciesSet = new Set<string>();
    data.forEach(occurrence => {
      speciesSet.add(occurrence.scientificName);
    });
    return Array.from(speciesSet).sort();
  }, [regionData, selectedRegion]);

  // Calculate occurrence counts for each species
  const speciesCounts = useMemo(() => {
    if (!regionData || !selectedRegion) return new Map<string, number>();
    const regionKey = selectedRegion === "North Atlantic" ? "North_Atlantic" : selectedRegion;
    const data = regionData[regionKey as keyof RegionData];
    if (!data) return new Map<string, number>();
    
    const counts = new Map<string, number>();
    data.forEach(occurrence => {
      const current = counts.get(occurrence.scientificName) || 0;
      counts.set(occurrence.scientificName, current + 1);
    });
    return counts;
  }, [regionData, selectedRegion]);

  // Create color mapping for species
  const speciesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    availableSpecies.forEach(species => {
      map.set(species, getSpeciesColor(species));
    });
    return map;
  }, [availableSpecies]);

  // Build color expression for map
  const colorExpression = useMemo(() => {
    if (selectedSpecies.length === 0) return "#4aa8ff";
    
    const expr: any[] = [
      "match",
      ["get", "scientificName"]
    ];
    
    selectedSpecies.forEach(species => {
      expr.push(species, speciesColorMap.get(species) || "#4aa8ff");
    });
    
    expr.push("#4aa8ff"); // default color
    return expr;
  }, [selectedSpecies, speciesColorMap]);

  // Reset selected species when region changes
  useEffect(() => {
    setSelectedSpecies([]);
  }, [selectedRegion]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    try {
      maptilersdk.config.apiKey = MAPTILER_KEY;
      const map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: maptilersdk.MapStyle.DATAVIZ.DARK,
        center: [0, 50],
        zoom: 2,
        pitch: 0,
        bearing: 0
      });
      
      mapRef.current = map;

      map.on("load", () => {
        if (!mapRef.current) return;
        mapReadyRef.current = true;
        
        map.addSource("whale-presence", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        map.addLayer({
          id: "whale-presence",
          type: "circle",
          source: "whale-presence",
          paint: {
            "circle-radius": 5,
            "circle-color": "#4aa8ff",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1,
            "circle-opacity": 0.7
          }
        });

        // Change cursor on hover
        map.on("mouseenter", "whale-presence", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "whale-presence", () => {
          map.getCanvas().style.cursor = "";
        });

        // Create popup instance
        const popup = new maptilersdk.Popup({
          closeButton: true,
          closeOnClick: false,
          anchor: "bottom",
          offset: [0, -10]
        });
        popupRef.current = popup;

        // Handle clicks on whale features
        map.on("click", "whale-presence", (e) => {
          if (e.features && e.features.length > 0 && e.lngLat && popupRef.current) {
            const feature = e.features[0];
            const props = feature.properties;
            if (props) {
              const scientificName = props.scientificName || "";
              const month = props.month || 0;
              const year = props.year || 2011;
              const day = props.day || 0;
              
              // Get color from the map - we need to access speciesColorMap
              // Since this is inside the map.on("load"), we'll need to get it from the closure
              // For now, we'll calculate it here
              const color = getSpeciesColor(scientificName);
              
              // Create popup content
              const popupContent = document.createElement("div");
              popupContent.style.padding = "8px";
              popupContent.style.minWidth = "200px";
              
              const speciesDiv = document.createElement("div");
              speciesDiv.style.marginBottom = "8px";
              speciesDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 500;">Species:</span>
                  <span style="background-color: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                    ${scientificName}
                  </span>
                </div>
              `;
              
              const dateDiv = document.createElement("div");
              dateDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-weight: 500;">Date:</span>
                  <span style="font-size: 12px;">
                    ${MONTH_NAMES[month - 1]} ${day}, ${year}
                  </span>
                </div>
              `;
              
              popupContent.appendChild(speciesDiv);
              popupContent.appendChild(dateDiv);
              
              // Set popup content and show at clicked location
              popupRef.current.setLngLat([e.lngLat.lng, e.lngLat.lat])
                .setDOMContent(popupContent)
                .addTo(map);
            }
          }
        });

        // Close popup when clicking outside of features
        map.on("click", (e) => {
          // Check if the click was on a feature
          const features = map.queryRenderedFeatures(e.point, {
            layers: ["whale-presence"]
          });
          
          // If no features were clicked and popup is open, close it
          if (features.length === 0 && popupRef.current) {
            popupRef.current.remove();
          }
        });
      });

      map.on("error", (e) => {
        console.error("Map error:", e);
      });

      return () => {
        mapReadyRef.current = false;
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }, []);

  // Update map with filtered data
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !regionData || !selectedRegion || selectedSpecies.length === 0) {
      // Clear map if no species selected
      if (mapReadyRef.current && mapRef.current) {
        const source = mapRef.current.getSource("whale-presence") as maptilersdk.GeoJSONSource | undefined;
        if (source) {
          source.setData({ type: "FeatureCollection", features: [] } as any);
        }
      }
      return;
    }

    const regionKey = selectedRegion === "North Atlantic" ? "North_Atlantic" : selectedRegion;
    const data = regionData[regionKey as keyof RegionData];
    if (!data) return;

    // Filter data by selected species
    const filtered = data.filter(occurrence => 
      selectedSpecies.includes(occurrence.scientificName)
    );

    // Convert to GeoJSON
    const features = filtered.map(occurrence => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [occurrence.lon, occurrence.lat] as [number, number]
      },
      properties: {
        scientificName: occurrence.scientificName,
        year: occurrence.year,
        month: occurrence.month,
        day: occurrence.day
      }
    }));

    const geojson = {
      type: "FeatureCollection" as const,
      features
    };

    // Update map source
    const source = mapRef.current.getSource("whale-presence") as maptilersdk.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson as any);
      
      // Update layer color based on species
      if (mapRef.current.getLayer("whale-presence")) {
        mapRef.current.setPaintProperty("whale-presence", "circle-color", colorExpression);
      }
      
      // Fit map to bounds if we have data
      if (features.length > 0) {
        const coordinates = features.map(f => f.geometry.coordinates);
        const bounds = coordinates.reduce(
          (acc, [lon, lat]) => {
            acc.minLon = Math.min(acc.minLon, lon);
            acc.maxLon = Math.max(acc.maxLon, lon);
            acc.minLat = Math.min(acc.minLat, lat);
            acc.maxLat = Math.max(acc.maxLat, lat);
            return acc;
          },
          { minLon: Infinity, maxLon: -Infinity, minLat: Infinity, maxLat: -Infinity }
        );

        if (bounds.minLon !== Infinity) {
          mapRef.current.fitBounds(
            [[bounds.minLon, bounds.minLat], [bounds.maxLon, bounds.maxLat]],
            { padding: 50, duration: 500 }
          );
        }
      }
    }
  }, [regionData, selectedRegion, selectedSpecies, colorExpression]);

  // Update color expression when it changes
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current) return;
    if (mapRef.current.getLayer("whale-presence")) {
      mapRef.current.setPaintProperty("whale-presence", "circle-color", colorExpression);
    }
  }, [colorExpression]);

  // Style the selected pills with colors
  useEffect(() => {
    if (!multiSelectRef.current) return;
    
    // Use a small delay to ensure DOM is updated
    const timeoutId = setTimeout(() => {
      // Find all pill elements within the MultiSelect
      const container = multiSelectRef.current?.closest(".mantine-MultiSelect-root");
      if (!container) return;

      const pills = container.querySelectorAll(".mantine-MultiSelect-pill");
      pills.forEach((pill) => {
        const pillElement = pill as HTMLElement;
        // Get the text content and try to match with selected species
        const pillText = pillElement.textContent?.trim() || "";
        
        // Find matching species (handle cases where text might have extra characters like X button)
        const matchingSpecies = selectedSpecies.find(species => 
          pillText.includes(species) || pillText === species
        );
        
        if (matchingSpecies) {
          const color = speciesColorMap.get(matchingSpecies) || "#4aa8ff";
          pillElement.style.backgroundColor = color;
          pillElement.style.color = "white";
        }
      });
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [selectedSpecies, speciesColorMap]);

  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="md">
        <Title order={2} c={"white"}>Whale Presence</Title>
        <Stack gap="md">
          {/* Row 1: Controls in one line */}
          <Group grow align="flex-end" gap="md">
          <Select
              label="Region"
              styles={{
                label: { color: "white" },
                input: {
                  color: "white",
                  borderColor: "white",
                  backgroundColor: "transparent"
                },
                dropdown: {
                  backgroundColor: "#0b1020",
                  borderColor: "white"
                },
                option: {
                  color: "white"
                }
              }}
              placeholder="Select a region"
              data={["Europe", "North Atlantic"]}
              value={selectedRegion}
              onChange={setSelectedRegion}
            />

            <MultiSelect
              label="Species"
              placeholder={selectedRegion ? "Select species" : "Select a region first"}
              data={availableSpecies.map(species => {
                const count = speciesCounts.get(species) || 0;
                return {
                  value: species,
                  label: `${species} (${count} ${count === 1 ? "occurrence" : "occurrences"})`
                };
              })}
              value={selectedSpecies}
              onChange={setSelectedSpecies}
              disabled={!selectedRegion || availableSpecies.length === 0}
              searchable
              clearable

              styles={{
                /* Label */
                label: {
                  color: "white",
                  fontWeight: 500
                },

                /* Input wrapper */
                input: {
                  backgroundColor: "transparent",
                  borderColor: "white",

                  "&:hover": {
                    borderColor: "#4aa8ff"
                  },
                  "&:focus-within": {
                    borderColor: "#4aa8ff"
                  }
                },

                /* Actual text + placeholder */
                inputField: {
                  color: "white",

                  "::placeholder": {
                    color: "rgba(255,255,255,0.55)"
                  }
                },

                /* Dropdown */
                dropdown: {
                  backgroundColor: "#0b1020",
                  borderColor: "white"
                },

                /* Options */
                option: {
                  color: "white",

                  "&[data-hovered]": {
                    backgroundColor: "rgba(74,168,255,0.15)"
                  }
                },

                /* Selected pills */
                pill: {
                  backgroundColor: "rgba(74,168,255,0.25)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.4)"
                }
              }}

              renderOption={({ option }) => {
                const color = speciesColorMap.get(option.value) || "#4aa8ff";
                return (
                  <Group gap="xs">
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        backgroundColor: color,
                        border: "1px solid rgba(255,255,255,0.3)"
                      }}
                    />
                    <Text c="white">{option.label}</Text>
                  </Group>
                );
              }}
            />


          </Group>

          {/* Row 2: Big map */}
          <div
            ref={mapContainerRef}
            style={{
              width: "100%",
              height: "60vh",
              borderRadius: 8,
              overflow: "hidden"
            }}
          />
        </Stack>

      </Stack>

    </Paper>
  );
}


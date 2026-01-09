import { useState, useEffect, useRef, useMemo } from "react";
import { Paper, Stack, Text, Title, SimpleGrid, Card, Image, Button, Group, Slider, rem, ActionIcon } from "@mantine/core";
import { LineChart } from "@mantine/charts";
import * as maptilersdk from "@maptiler/sdk";
import { fetchTemperature, fetchSalinity } from "../services/api";

const WHALE_SPECIES = [
  {
    id: "balaenoptera-physalus",
    scientificName: "Balaenoptera physalus",
    commonName: "Fin Whale",
    description: "The second-largest whale species, known for its streamlined body and distinctive asymmetrical coloration."
  },
  {
    id: "balaenoptera-acutorostrata",
    scientificName: "Balaenoptera acutorostrata",
    commonName: "Minke Whale",
    description: "The smallest baleen whale, highly acrobatic and commonly observed in coastal waters."
  },
  {
    id: "megaptera-novaeangliae",
    scientificName: "Megaptera novaeangliae",
    commonName: "Humpback Whale",
    description: "Famous for their long pectoral fins and complex songs, often seen breaching."
  }
];

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december"
];

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "j72DJvKfg99jStOjT7xE";

type MonthData = {
  centroid: { lon: number; lat: number } | null;
  occurences: Array<{ lon: number; lat: number }>;
  mean_temperature: { mean: number; points_processed: number; total_points: number } | "null";
  mean_salinity: { mean: number; points_processed: number; total_points: number } | "null";
};

type SpeciesData = {
  [month: string]: MonthData;
};

type WhaleData = {
  [species: string]: SpeciesData;
};

function SpeciesDetailView({ 
  species, 
  onSpeciesChange 
}: { 
  species: typeof WHALE_SPECIES[0]; 
  onSpeciesChange: (id: string) => void;
}) {
  const [whaleData, setWhaleData] = useState<WhaleData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(0);
  const [envDataType, setEnvDataType] = useState<"temperature" | "salinity">("temperature");
  const [envData, setEnvData] = useState<any>(null);
  const [loadingEnvData, setLoadingEnvData] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const mapReadyRef = useRef(false);
  const mapBoundsRef = useRef<{ min_lon: number; max_lon: number; min_lat: number; max_lat: number } | null>(null);

  // Load whale data
  useEffect(() => {
    let cancelled = false;
    fetch("/data/whales_2011_top3_by_species_month.json")
      .then(r => r.json())
      .then((data: WhaleData) => {
        if (!cancelled) setWhaleData(data);
      })
      .catch(err => console.error("Failed to load whale data:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    try {
      maptilersdk.config.apiKey = MAPTILER_KEY;
      const map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: maptilersdk.MapStyle.DATAVIZ.DARK,
        center: [0, 60],
        zoom: 1.5,
        pitch: 0,
        bearing: 0
      });
      
      mapRef.current = map;

      map.on("load", () => {
        if (!mapRef.current) return;
        mapReadyRef.current = true;
        
        // Capture initial bounds
        const bounds = map.getBounds();
        mapBoundsRef.current = {
          min_lon: Math.max(-180, bounds.getWest()),
          max_lon: Math.min(180, bounds.getEast()),
          min_lat: Math.max(-90, bounds.getSouth()),
          max_lat: Math.min(90, bounds.getNorth())
        };
        
        map.addSource("whale-occurrences", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        map.addLayer({
          id: "whale-occurrences",
          type: "circle",
          source: "whale-occurrences",
          paint: {
            "circle-radius": 6,
            "circle-color": "#4aa8ff",
            "circle-stroke-color": "#fff",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.8
          }
        });
      });

      // Update bounds when user moves the map
      map.on('moveend', () => {
        if (!mapRef.current) return;
        const bounds = map.getBounds();
        mapBoundsRef.current = {
          min_lon: Math.max(-180, bounds.getWest()),
          max_lon: Math.min(180, bounds.getEast()),
          min_lat: Math.max(-90, bounds.getSouth()),
          max_lat: Math.min(90, bounds.getNorth())
        };
      });

      map.on("error", (e) => {
        console.error("Map error:", e);
      });

      return () => {
        mapReadyRef.current = false;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (error) {
      console.error("Failed to initialize map:", error);
    }
  }, []);

  // Fetch environmental data - triggered after map moves to correct position
  useEffect(() => {
    if (!mapReadyRef.current) return; // Only need map ready

    let cancelled = false;

    const fetchEnvData = async () => {
      setLoadingEnvData(true);
      
      // Wait a moment for bounds to be updated after map movement
      await new Promise(resolve => setTimeout(resolve, 200));

      try {
        // Try to get bounds from whale data first, otherwise use map bounds
        let bounds = mapBoundsRef.current;
        
        if (!bounds && whaleData) {
          const speciesData = whaleData[species.scientificName];
          if (speciesData) {
            const monthName = MONTHS[selectedMonth];
            const monthData = speciesData[monthName];
            if (monthData?.centroid) {
              bounds = {
                min_lon: Math.max(-180, monthData.centroid.lon - 20),
                max_lon: Math.min(180, monthData.centroid.lon + 20),
                min_lat: Math.max(-90, monthData.centroid.lat - 15),
                max_lat: Math.min(90, monthData.centroid.lat + 15)
              };
            }
          }
        }
        
        // Final fallback: use default bounds if nothing else is available
        if (!bounds) {
          bounds = {
            min_lon: -30,
            max_lon: 10,
            min_lat: 50,
            max_lat: 70
          };
        }

        // Format time as YYYY-MM
        const year = 2011;
        const month = String(selectedMonth + 1).padStart(2, "0");
        const timeString = `${year}-${month}`;

        // Load data with stride 3 (will be cached on backend)
        const data = envDataType === "temperature" 
          ? await fetchTemperature(bounds, timeString, 0, 3)
          : await fetchSalinity(bounds, timeString, 0, 3);

        if (cancelled) return;
        
        setEnvData(data);
        setLoadingEnvData(false);
        
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch environmental data:", error);
          setEnvData(null);
          setLoadingEnvData(false);
        }
      }
    };

    fetchEnvData();

    return () => {
      cancelled = true;
    };
  }, [whaleData, species, selectedMonth, envDataType]);

  // Add environmental data heatmap to map
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !envData) {
      return;
    }

    const map = mapRef.current;
    const layerId = "env-heatmap";

    // Remove existing layer if present
    if (map.getLayer(layerId)) {
      map.removeLayer(layerId);
    }
    if (map.getSource(layerId)) {
      map.removeSource(layerId);
    }

    try {
      let features: any[] = [];

      // Handle API response format: grid with coords and 2D data array
      if (envData.coords && envData.data && Array.isArray(envData.data)) {
        const { latitude, longitude } = envData.coords;
        const gridData = envData.data;
        
        // Iterate through the 2D grid
        // data[i][j] corresponds to latitude[i], longitude[j]
        gridData.forEach((row: any[], latIndex: number) => {
          row.forEach((value: number | null, lonIndex: number) => {
            // Only add points with valid (non-null) values
            if (value !== null && !isNaN(value)) {
              features.push({
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: [longitude[lonIndex], latitude[latIndex]]
                },
                properties: { value }
              });
            }
          });
        });
      } else {
        console.warn("⚠️ Unknown data format. Keys:", Object.keys(envData));
      }

      if (features.length === 0) {
        return;
      }

      const geojson = {
        type: "FeatureCollection",
        features
      };

      map.addSource(layerId, {
        type: "geojson",
        data: geojson as any
      });

      // Calculate min/max values from the data for proper color scaling
      const values = features.map(f => f.properties.value).filter(v => v !== null && !isNaN(v));
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);

      // Scientific heatmap with sharp edges - clear grid visualization
      map.addLayer({
        id: layerId,
        type: "circle",
        source: layerId,
        paint: {
          // Logical color scale: Blue (cold/low) → Cyan → Green → Yellow → Red (hot/high)
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "value"],
            minValue,
            envDataType === "temperature" ? "#0000ff" : "#2166ac", // Cold/Low = Blue
            minValue + (maxValue - minValue) * 0.2,
            envDataType === "temperature" ? "#00ffff" : "#4393c3", // Cool = Cyan
            minValue + (maxValue - minValue) * 0.4,
            envDataType === "temperature" ? "#00ff00" : "#92c5de", // Medium-Cool = Green/Light Blue
            minValue + (maxValue - minValue) * 0.6,
            envDataType === "temperature" ? "#ffff00" : "#fddbc7", // Medium-Warm = Yellow
            minValue + (maxValue - minValue) * 0.8,
            envDataType === "temperature" ? "#ff8800" : "#f4a582", // Warm = Orange
            maxValue,
            envDataType === "temperature" ? "#ff0000" : "#d6604d"  // Hot/High = Red
          ],
          // Fixed size for clear grid structure
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0, 6,
            2, 8,
            4, 12,
            6, 18
          ],
          // NO blur for sharp edges
          "circle-blur": 0,
          // High opacity for clear visibility
          "circle-opacity": 0.85,
          // Optional: add subtle stroke for grid definition
          "circle-stroke-width": 0,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": 0.1
        }
      });

      console.log("✅ Environmental heatmap layer added successfully");

      // Move whale occurrences layer on top
      if (map.getLayer("whale-occurrences")) {
        map.moveLayer("whale-occurrences");
      }
    } catch (error) {
      console.error("Failed to add environmental layer:", error);
    }
  }, [envData, envDataType, mapReadyRef.current]);

  // Update map when month or species changes
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !whaleData) return;
    
    const map = mapRef.current;
    const speciesData = whaleData[species.scientificName];
    if (!speciesData) return;

    const monthName = MONTHS[selectedMonth];
    const monthData = speciesData[monthName];
    
    if (!monthData) return;

    // Update occurrences on map
    const geojson = {
      type: "FeatureCollection",
      features: monthData.occurences.map(occ => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [occ.lon, occ.lat] },
        properties: {}
      }))
    };

    const src = map.getSource("whale-occurrences") as maptilersdk.GeoJSONSource | undefined;
    src?.setData(geojson as any);

    // Fly to centroid if available
    if (monthData.centroid) {
      map.flyTo({
        center: [monthData.centroid.lon, monthData.centroid.lat],
        zoom: 2,
        speed: 0.8
      });
    }
  }, [whaleData, species, selectedMonth]);

  // Prepare chart data
  const { temperatureData, salinityData } = useMemo(() => {
    if (!whaleData) return { temperatureData: [], salinityData: [] };
    
    const speciesData = whaleData[species.scientificName];
    if (!speciesData) return { temperatureData: [], salinityData: [] };

    const tempData = MONTHS.map((month, idx) => {
      const monthData = speciesData[month];
      const temp = monthData?.mean_temperature;
      return {
        month: MONTH_LABELS[idx],
        temperature: temp && temp !== "null" ? temp.mean : 0,
        isCurrentMonth: idx === selectedMonth
      };
    });

    const salData = MONTHS.map((month, idx) => {
      const monthData = speciesData[month];
      const sal = monthData?.mean_salinity;
      return {
        month: MONTH_LABELS[idx],
        salinity: sal && sal !== "null" ? sal.mean : 0,
        isCurrentMonth: idx === selectedMonth
      };
    });

    return { temperatureData: tempData, salinityData: salData };
  }, [whaleData, species, selectedMonth]);

  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="md">
        {/* Species Navigation */}
        <Group justify="space-between" wrap="nowrap">
          <Title order={4}>{species.commonName}</Title>
          <Group gap="xs">
            {WHALE_SPECIES.map((s) => (
              <Button
                key={s.id}
                size="xs"
                variant={s.id === species.id ? "filled" : "light"}
                onClick={() => onSpeciesChange(s.id)}
              >
                {s.commonName}
              </Button>
            ))}
          </Group>
        </Group>

        {/* Main Content Grid */}
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
          {/* Left: Charts */}
          <Stack gap="md">
            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Title order={6}>Mean Temperature by Month (°C)</Title>
                  <ActionIcon
                    variant={envDataType === "temperature" ? "filled" : "light"}
                    color={envDataType === "temperature" ? "orange" : "gray"}
                    onClick={() => setEnvDataType("temperature")}
                    title="Show temperature on map"
                    size="lg"
                  >
                    🗺️
                  </ActionIcon>
                </Group>
                <LineChart
                  h={250}
                  data={temperatureData}
                  dataKey="month"
                  series={[{ 
                    name: "temperature", 
                    color: "orange.6"
                  }]}
                  tickLine="y"
                  referenceLines={[
                    {
                      x: MONTH_LABELS[selectedMonth],
                      color: "red",
                      label: "Current",
                      strokeDasharray: "5 5"
                    }
                  ]}
                  curveType="natural"
                  withDots
                  dotProps={{ r: 4 }}
                  activeDotProps={{ r: 6 }}
                />
              </Stack>
            </Paper>

            <Paper withBorder p="md" radius="md">
              <Stack gap="xs">
                <Group justify="space-between" align="center">
                  <Title order={6}>Mean Salinity by Month (PSU)</Title>
                  <ActionIcon
                    variant={envDataType === "salinity" ? "filled" : "light"}
                    color={envDataType === "salinity" ? "cyan" : "gray"}
                    onClick={() => setEnvDataType("salinity")}
                    title="Show salinity on map"
                    size="lg"
                  >
                    🗺️
                  </ActionIcon>
                </Group>
                <LineChart
                  h={250}
                  data={salinityData}
                  dataKey="month"
                  series={[{ 
                    name: "salinity", 
                    color: "cyan.6"
                  }]}
                  tickLine="y"
                  referenceLines={[
                    {
                      x: MONTH_LABELS[selectedMonth],
                      color: "red",
                      label: "Current",
                      strokeDasharray: "5 5"
                    }
                  ]}
                  curveType="natural"
                  withDots
                  dotProps={{ r: 4 }}
                  activeDotProps={{ r: 6 }}
                />
              </Stack>
            </Paper>
          </Stack>

          {/* Right: Map and Slider */}
          <Stack gap="md">
            <Paper
              withBorder
              p="sm"
              radius="md"
              style={{ height: rem(450) }}
            >
              <div
                ref={mapContainerRef}
                style={{ width: "100%", height: "100%", borderRadius: rem(8), overflow: "hidden" }}
              />
            </Paper>

            {loadingEnvData && (
              <Paper withBorder p="md" radius="md">
                <Text size="sm" c="dimmed">Loading environmental data...</Text>
              </Paper>
            )}

            <Paper withBorder p="md" radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Text fw={500} size="sm">Month</Text>
                  <Group gap="xs">
                    <ActionIcon
                      variant="light"
                      onClick={() => setSelectedMonth(prev => (prev === 0 ? 11 : prev - 1))}
                      aria-label="Previous month"
                    >
                      ◀
                    </ActionIcon>
                    <Text size="sm" c="dimmed" style={{ minWidth: "80px", textAlign: "center" }}>
                      {MONTH_LABELS[selectedMonth]} 2011
                    </Text>
                    <ActionIcon
                      variant="light"
                      onClick={() => setSelectedMonth(prev => (prev === 11 ? 0 : prev + 1))}
                      aria-label="Next month"
                    >
                      ▶
                    </ActionIcon>
                  </Group>
                </Group>
                <Slider
                  value={selectedMonth}
                  onChange={setSelectedMonth}
                  min={0}
                  max={11}
                  step={1}
                  marks={MONTHS.map((_, idx) => ({ value: idx, label: idx % 3 === 0 ? MONTH_LABELS[idx] : "" }))}
                />
              </Stack>
            </Paper>
          </Stack>
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

export default function DetailedOverviewBySpecies() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  if (selectedSpecies) {
    const species = WHALE_SPECIES.find(s => s.id === selectedSpecies);
    if (!species) return null;
    
    return (
      <SpeciesDetailView 
        species={species} 
        onSpeciesChange={setSelectedSpecies}
      />
    );
  }

  return (
    <Paper withBorder p="xl" radius="lg" style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2d5a8c 100%)" }}>
      <Stack gap="xl" align="center">
        <Stack gap="xs" align="center">
          <Title order={3} style={{ color: "white", textAlign: "center" }}>
            Izberi vrsto ki jo želiš trackat
          </Title>
        </Stack>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" w="100%">
          {WHALE_SPECIES.map((species) => (
            <Card
              key={species.id}
              shadow="md"
              padding="lg"
              radius="md"
              style={{ cursor: "pointer", transition: "transform 0.2s" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
              onClick={() => setSelectedSpecies(species.id)}
            >
              <Card.Section>
                <Image
                  src="https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&auto=format&fit=crop"
                  height={200}
                  alt={species.commonName}
                />
              </Card.Section>

              <Stack gap="xs" mt="md">
                <Text fw={600} size="lg">
                  {species.commonName}
                </Text>
                <Text size="sm" c="dimmed">
                  {species.scientificName}
                </Text>
                <Text size="sm" lineClamp={3}>
                  {species.description}
                </Text>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>

        <Text size="sm" c="rgba(255,255,255,0.8)" ta="center" maw={800} px="md">
          Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum 
          Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum 
          Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum Lorem ipsum lorem ipsum
        </Text>

        <Text size="xs" c="rgba(255,255,255,0.6)" ta="center" maw={800} px="md">
          *na vizualizaciji so lokacije kitov označene na območjih, kjer je bila vrsta opažena
        </Text>
      </Stack>
    </Paper>
  );
}


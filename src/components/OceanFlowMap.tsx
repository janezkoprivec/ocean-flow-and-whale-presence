import { useEffect, useMemo, useRef, useState } from "react";
import {
  AppShell,
  Badge,
  Button,
  Divider,
  Group,
  Paper,
  rem,
  Select,
  SimpleGrid,
  Grid,
  Slider,
  Stack,
  Switch,
  Text,
  Title
} from "@mantine/core";

import { LineChart } from "@mantine/charts";
import {
  RadialBarChart,
  RadialBar,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import * as maptilersdk from "@maptiler/sdk";
import { theme } from "../theme";

type WhaleFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: Record<string, any>;
};

type WhaleCollection = {
  type: "FeatureCollection";
  features: WhaleFeature[];
};

type CurrentsData = {
  steps: Array<Array<{ lat: number; lon: number; w: number }>>;
  labels?: string[];
};

type SeasonalityPoint = { label: string; count: number; monthIndex: number };

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "j72DJvKfg99jStOjT7xE";
const MONTH_COUNT = 24; // 2011–2012 covered by ECCO

const bookmarks: Record<string, { center: [number, number]; zoom: number }> = {
  med: { center: [15, 35], zoom: 4 },
  biscay: { center: [-5, 45], zoom: 5 },
  norway: { center: [10, 65], zoom: 4.5 },
  northsea: { center: [3, 56], zoom: 5 },
  iceland: { center: [-20, 65], zoom: 4.5 }
};

function formatMonth(idx: number) {
  const year = 2011 + Math.floor(idx / 12);
  const month = (idx % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getSpeciesName(props: Record<string, any>) {
  return (
    props.species ||
    props.species_name ||
    props.spec ||
    props.scientificName ||
    props.commonName ||
    "Unknown"
  );
}

function buildSpeciesColorExpression(speciesList: string[]) {
  if (!speciesList.length) return "#77c5f7";
  const expr: any[] = [
    "match",
    ["coalesce", ["get", "species"], ["get", "species_name"], ["get", "spec"], ["get", "scientificName"], ["get", "commonName"]]
  ];
  speciesList.forEach(sp => {
    const hue = Math.abs(sp.split("").reduce((h, ch) => (h << 5) - h + ch.charCodeAt(0), 0)) % 360;
    const color = `hsl(${hue},70%,60%)`;
    expr.push(sp, color);
  });
  expr.push("#77c5f7");
  return expr;
}

export default function OceanFlowMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const mapReadyRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);

  const [range, setRange] = useState<"2011_2012" | "2010_2013">("2011_2012");
  const [species, setSpecies] = useState<string>("All");
  const [speciesOptions, setSpeciesOptions] = useState<string[]>([]);
  const [monthIndex, setMonthIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showWhales, setShowWhales] = useState(true);
  const [showCurrents, setShowCurrents] = useState(true);

  const [whalesData, setWhalesData] = useState<WhaleCollection | null>(null);
  const [currents, setCurrents] = useState<CurrentsData | null>(null);
  const [seasonality, setSeasonality] = useState<SeasonalityPoint[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const url =
        range === "2010_2013"
          ? "/data/whales_2010_2013.geojson"
          : "/data/whales_2011_2012.geojson";
      const res = await fetch(url);
      const json: WhaleCollection = await res.json();
      if (!cancelled) setWhalesData(json);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    fetch("/data/vertical_flow_w_surface.json")
      .then(r => r.json())
      .then((data: CurrentsData) => {
        if (!cancelled) setCurrents(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    fetch("/data/whales_monthly_counts.csv")
      .then(r => r.text())
      .then(text => {
        const [, ...lines] = text.trim().split("\n");
        const parsed = lines
          .map(line => line.split(","))
          .map(([year, month, count]) => ({
            year: Number(year),
            month: Number(month),
            count: Number(count)
          }))
          .map(d => ({
            label: `${d.year}-${String(d.month).padStart(2, "0")}`,
            count: d.count,
            monthIndex: (d.year - 2011) * 12 + (d.month - 1)
          }))
          .sort((a, b) => a.monthIndex - b.monthIndex);
        setSeasonality(parsed);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    maptilersdk.config.apiKey = MAPTILER_KEY;
    const map = new maptilersdk.Map({
      container: mapContainerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.DARK,
      center: [0, 45],
      zoom: 1.8,
      pitch: 35,
      bearing: 0,
      projection: "globe"
    });
    mapRef.current = map;

    map.on("load", () => {
      mapReadyRef.current = true;
      setMapReady(true);
      map.addSource("whales", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] }
      });
      map.addLayer({
        id: "whales",
        type: "circle",
        source: "whales",
        paint: {
          "circle-radius": 4,
          "circle-color": "#77c5f7",
          "circle-stroke-color": "#000",
          "circle-stroke-width": 0.4,
          "circle-opacity": 0.9
        }
      });
    });

    return () => {
      mapReadyRef.current = false;
      setMapReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!whalesData) return;
    const set = new Set<string>();
    whalesData.features.forEach(f => {
      const s = getSpeciesName(f.properties);
      if (s) set.add(String(s));
    });
    const opts = Array.from(set).sort();
    setSpeciesOptions(opts);
    if (species !== "All" && !set.has(species)) {
      setSpecies("All");
    }
  }, [whalesData]);

  const filteredWhales = useMemo<WhaleCollection | null>(() => {
    if (!whalesData) return null;
    const features = whalesData.features.filter(f => {
      const p = f.properties || {};
      let inRange = true;
      if (range === "2011_2012") inRange = p.year >= 2011 && p.year <= 2012;
      if (range === "2010_2013") inRange = p.year >= 2010 && p.year <= 2013;

      const speciesMatch =
        species === "All" ||
        [p.species, p.species_name, p.spec, p.scientificName, p.commonName].includes(species);

      let monthMatch = true;
      if (typeof p.year === "number" && typeof p.month === "number") {
        const idx = (p.year - 2011) * 12 + (p.month - 1);
        monthMatch = Math.abs(idx - monthIndex) <= 1;
      }

      return inRange && speciesMatch && monthMatch;
    });
    return { ...whalesData, features };
  }, [whalesData, range, species, monthIndex]);

  const speciesChart = useMemo(() => {
    if (!filteredWhales) return [];
    const counts: Record<string, number> = {};
    filteredWhales.features.forEach(f => {
      const s = getSpeciesName(f.properties);
      counts[s] = (counts[s] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([species, count]) => ({ species, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredWhales]);

  const radialSpeciesData = useMemo(() => {
    return speciesChart.map((d, index) => ({
      name: d.species,
      value: d.count,
      fill: `hsl(${(index * 45) % 360}, 70%, 60%)`
    }));
  }, [speciesChart]);
  
  

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !mapRef.current.getSource("whales")) return;
    const map = mapRef.current;
    if (!showWhales) {
      map.setLayoutProperty("whales", "visibility", "none");
      return;
    }
    map.setLayoutProperty("whales", "visibility", "visible");
    if (filteredWhales) {
      const src = map.getSource("whales") as maptilersdk.GeoJSONSource | undefined;
      src?.setData(filteredWhales as any);
    }
    const paintExpr = buildSpeciesColorExpression(speciesOptions);
    map.setPaintProperty("whales", "circle-color", paintExpr as any);
  }, [filteredWhales, showWhales, speciesOptions, mapReady]);

  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !currents) return;
    const map = mapRef.current;
    const layerId = "currents";

    if (!showCurrents) {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(layerId)) map.removeSource(layerId);
      return;
    }

    const step = currents.steps?.[Math.min(monthIndex, currents.steps.length - 1)] || [];
    const geojson = {
      type: "FeatureCollection",
      features: step.map(pt => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [pt.lon, pt.lat] },
        properties: { w: pt.w }
      }))
    };

    if (map.getSource(layerId)) {
      const src = map.getSource(layerId) as maptilersdk.GeoJSONSource | undefined;
      src?.setData(geojson as any);
      map.setLayoutProperty(layerId, "visibility", "visible");
      return;
    }

    map.addSource(layerId, { type: "geojson", data: geojson as any });
    map.addLayer({
      id: layerId,
      type: "circle",
      source: layerId,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["abs", ["get", "w"]], 0, 2, 0.02, 6, 0.05, 12],
        "circle-color": ["case", [">=", ["get", "w"], 0], "#4aa8ff", "#ff6b6b"],
        "circle-opacity": 0.6
      }
    });
  }, [currents, monthIndex, showCurrents, mapReady]);

  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setMonthIndex(prev => (prev + 1) % MONTH_COUNT);
    }, 1200);
    return () => clearInterval(timer);
  }, [playing]);

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Grid gutter="xs">
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack>
              <Paper p="md" radius="lg">
                <Stack gap="md" c="white">
                <Group justify="space-between">
                  <Title order={2} c="white">Filters</Title>
                </Group>
                <Stack gap={40}>
                  <Group justify="space-between">
                    <Text fs="bold" fw={1000}>Currently displayed month:</Text>
                    <Badge variant="light" color="blue" size="bg" p={5} pl={10} pr={10}>
                      {formatMonth(monthIndex)}
                    </Badge>
                  </Group>
                  <Slider
                    value={monthIndex}
                    onChange={setMonthIndex}
                    min={0}
                    max={MONTH_COUNT - 1}
                    step={1}
                    marks={[
                      { value: 0, label: "Start"},
                      { value: MONTH_COUNT - 1, label: "End"}
                    ]}
                    styles={{
                      markLabel: {
                        color: "white",
                        fontWeight: 600,
                        fontSize: "12px"
                      }
                    }}
                  />
                  <Group gap="lg" justify="center">
                    <Button size="md" variant="light" onClick={() => setPlaying(p => !p)}>
                      {playing ? "Pause" : "Play"}
                    </Button>
                  </Group>
                </Stack>
                <Divider />
                <Stack gap="xs">
                  <Text fw={500} fs={"bold"}>Bookmarks</Text>
                  <Group gap="xs">
                    {Object.entries(bookmarks).map(([key, val]) => (
                      <Button
                        key={key}
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          if (!mapRef.current) return;
                          mapRef.current.flyTo({ center: val.center, zoom: val.zoom, speed: 0.7 });
                        }}
                      >
                        {key === "med" && "Mediterranean"}
                        {key === "biscay" && "Bay of Biscay"}
                        {key === "norway" && "Norwegian Sea"}
                        {key === "northsea" && "North Sea"}
                        {key === "iceland" && "Iceland"}
                      </Button>
                    ))}
                  </Group>
                </Stack>
                <Divider />
                <Text size="sm" c="white">
                  OBIS{" "}
                  <Text component="span" fs="italic">
                    Cetacea
                  </Text>{" "}
                  are presence records (not tracked individuals). w &gt; 0 indicates
                  upwelling, w &lt; 0 downwelling. Currents data covers 2011–2012.
                </Text>

              </Stack>
            </Paper>

          
            </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 8 }}>
              <Paper
                radius="lg"
                p="sm"
                style={{
                  background: theme.other?.mapBg ?? "#0b1020",
                  height: "calc(100vh - 180px)",
                  minHeight: rem(500)
                }}
              >
                <div
                  ref={mapContainerRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: rem(12),
                    overflow: "hidden"
                  }}
                />
              </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12 }}>
              <Grid gutter="md">
                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" radius="lg">
                    <Stack gap="sm">
                      <Title order={5} c="white">
                        Seasonality (monthly presence)
                      </Title>
                      <LineChart
                        h={220}
                        data={seasonality}
                        dataKey="label"
                        series={[{ name: "count", color: "cyan" }]}
                      />
                    </Stack>
                  </Paper>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 6 }}>
                  <Paper p="md" radius="lg">
                    <Stack gap="sm">
                      <Title order={5} c="white">
                        Top species (current filters)
                      </Title>
                      <div style={{ width: "100%", height: 260 }}>
                        <ResponsiveContainer>
                          <RadialBarChart
                            cx="50%"
                            cy="50%"
                            innerRadius="30%"
                            outerRadius="90%"
                            startAngle={90}
                            endAngle={-270}
                            data={radialSpeciesData}
                          >
                            <RadialBar
                              dataKey="value"
                              cornerRadius={8}
                              background={{ fill: "#3a5e7d" }}
                            >
                              {radialSpeciesData.map((_, index) => (
                                <Cell
                                  key={index}
                                  fill={`hsl(${(index * 45) % 360}, 70%, 60%)`}
                                />
                              ))}
                            </RadialBar>

                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#0b1020",
                                border: "1px solid #2c4a6a",
                                borderRadius: 8,
                                color: "white"
                              }}
                              formatter={(value) => [
                                value ?? 0,
                                "Occurrences"
                              ]}
                            />

                            <Legend
                              layout="vertical"
                              verticalAlign="middle"
                              align="right"
                              wrapperStyle={{
                                color: "white",
                                fontSize: 12
                              }}
                            />
                          </RadialBarChart>
                        </ResponsiveContainer>
                      </div>
              
                    </Stack>
                  </Paper>
                </Grid.Col>
              </Grid>
            </Grid.Col>
            </Grid>
      </AppShell.Main>
    </AppShell>
  );
}


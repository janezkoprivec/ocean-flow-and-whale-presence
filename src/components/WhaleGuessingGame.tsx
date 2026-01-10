import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Paper,
  rem,
  SimpleGrid,
  Stack,
  Text,
  Title
} from "@mantine/core";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import * as maptilersdk from "@maptiler/sdk";
import { theme } from "../theme";

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY ?? "j72DJvKfg99jStOjT7xE";

type WhaleOccurrence = {
  scientificName: string;
  year: number;
  month: number;
  day: number;
  longitude: number;
  latitude: number;
};

export default function WhaleGuessingGame() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const mapReadyRef = useRef(false);

  const [gameStarted, setGameStarted] = useState(false);
  const [, setClicks] = useState<Array<[number, number]>>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [whaleData, setWhaleData] = useState<WhaleOccurrence[] | null>(null);
  const [showWhaleData, setShowWhaleData] = useState(false);

  // Load whale data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/data/whales_2011_top3_all_occurances.json");
        const data: WhaleOccurrence[] = await res.json();
        if (!cancelled) {
          setWhaleData(data);
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

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      maptilersdk.config.apiKey = MAPTILER_KEY;
      const map = new maptilersdk.Map({
        container: mapContainerRef.current,
        style: maptilersdk.MapStyle.DATAVIZ.DARK,
        center: [0, 50],
        zoom: 3,
        pitch: 0,
        bearing: 0,
        // Constrain map to Europe and North Atlantic bounds
        // Europe: 29°-72° lat, -15°-45° lon
        // North Atlantic: 30°-75° lat, -80°-20° lon
        // Combined: 29°-75° lat, -80°-45° lon
        maxBounds: [[-80, 29], [45, 75]] as [[number, number], [number, number]]
      });

      mapRef.current = map;

      map.on("load", async () => {
        if (!mapRef.current) return;
        mapReadyRef.current = true;

        // Create light blue whale icon from SVG
        try {
          // SVG with light blue color (#04ffff)
          const whaleIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg fill="#04ffff" height="32px" width="32px" version="1.1" xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 300.086 300.086" xml:space="preserve">
<path fill="#04ffff" d="M252.472,129.074c-35.063,1.018-81.701,5.444-133.099,14.293c-51.4,8.846-62.426-5.467-67.398-21.439
  c-5.63-18.084,0.212-27.206,0.212-27.206c33.263-5.405,36.17-26.597,35.337-38.658c-3.323,4.165-8.413,6.899-12.634,7.058
  c-3.024,0.11-12.306-9.346-27.274,5.832c0.834-8.314-3.143-13.805-13.254-16.631C23.987,49.41,16.032,63.42,0.223,49.414
  c-3.326,44.068,31.594,45.308,31.594,45.308c-14.225,78.259,45.009,118.089,46.028,122.857c1.021,4.759-15.999,9.523-12.938,14.298
  c3.065,4.76,23.83,3.746,36.088,1.354c59.566,15.655,72.466,18.708,143.647,17.031c57.279-1.369,56.638-51.767,54.944-69.499
  C296.259,145.907,287.535,128.051,252.472,129.074z"/>
</svg>`;
          
          // Convert to data URI
          const encodedSvg = encodeURIComponent(whaleIconSvg);
          const dataUri = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;
          
          // Create image and load it
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (mapRef.current && mapRef.current.hasImage) {
              if (!mapRef.current.hasImage("whale-icon")) {
                mapRef.current.addImage("whale-icon", img);
              }
            }
          };
          img.onerror = (error) => {
            console.error("Failed to load whale icon:", error);
          };
          img.src = dataUri;
        } catch (error) {
          console.error("Failed to create whale icon:", error);
        }

        // Add whale data source (initially empty, will be populated when game completes)
        map.addSource("whale-data", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        map.addLayer({
          id: "whale-data",
          type: "circle",
          source: "whale-data",
          paint: {
            "circle-radius": 4,
            "circle-color": "#ffffff",
            "circle-stroke-color": "#000",
            "circle-stroke-width": 0.5,
            "circle-opacity": 0.9
          }
        });

        // Add user click markers source
        map.addSource("user-clicks", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] }
        });
        
        // Wait for icon to be loaded before adding the layer
        const checkIconAndAddLayer = () => {
          if (mapRef.current) {
            const hasIcon = mapRef.current.hasImage && mapRef.current.hasImage("whale-icon");
            if (hasIcon) {
              if (!mapRef.current.getLayer("user-clicks")) {
                mapRef.current.addLayer({
                  id: "user-clicks",
                  type: "symbol",
                  source: "user-clicks",
                  layout: {
                    "icon-image": "whale-icon",
                    "icon-size": 0.6,
                    "icon-allow-overlap": true,
                    "icon-ignore-placement": true
                  }
                });
              }
            } else {
              // Retry after a short delay if icon not loaded yet
              setTimeout(checkIconAndAddLayer, 100);
            }
          }
        };
        // Start checking after a brief delay to allow image to start loading
        setTimeout(checkIconAndAddLayer, 200);

        // Initially hide whale data layer
        map.setLayoutProperty("whale-data", "visibility", "none");
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

  // Handle map clicks
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !gameStarted || gameComplete) return;

    const map = mapRef.current;

    const handleClick = (e: maptilersdk.MapMouseEvent) => {
      if (!e.lngLat) return;

      const newClick: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      setClicks(prev => {
        const updated = [...prev, newClick];
        
        // Update user clicks layer
        if (map.getSource("user-clicks")) {
          const source = map.getSource("user-clicks") as maptilersdk.GeoJSONSource | undefined;
          if (source) {
            const features = updated.map(([lng, lat]) => ({
              type: "Feature" as const,
              geometry: {
                type: "Point" as const,
                coordinates: [lng, lat] as [number, number]
              },
              properties: {}
            }));
            source.setData({
              type: "FeatureCollection",
              features
            } as any);
          }
        }

        // Check if game is complete (5 clicks)
        if (updated.length >= 5) {
          setGameComplete(true);
          setShowWhaleData(true);
        }

        return updated;
      });
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [gameStarted, gameComplete]);

  // Update whale data layer when game completes and zoom out to show full area
  useEffect(() => {
    if (!mapReadyRef.current || !mapRef.current || !whaleData || !gameComplete) return;

    const map = mapRef.current;
    const source = map.getSource("whale-data") as maptilersdk.GeoJSONSource | undefined;

    if (source && showWhaleData) {
      const features = whaleData.map(occurrence => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [occurrence.longitude, occurrence.latitude] as [number, number]
        },
        properties: {
          scientificName: occurrence.scientificName,
          year: occurrence.year,
          month: occurrence.month,
          day: occurrence.day
        }
      }));

      source.setData({
        type: "FeatureCollection",
        features
      } as any);

      map.setLayoutProperty("whale-data", "visibility", "visible");

      // Zoom out to show the full Europe/North Atlantic area
      // Using the same bounds as maxBounds: [[-80, 29], [45, 75]]
      map.fitBounds(
        [[-80, 29], [45, 75]] as [[number, number], [number, number]],
        {
          padding: 50,
          duration: 1000
        }
      );
    } else if (source && !showWhaleData) {
      map.setLayoutProperty("whale-data", "visibility", "none");
    }
  }, [whaleData, gameComplete, showWhaleData]);

  // Reset game function
  const resetGame = () => {
    setGameStarted(false);
    setClicks([]);
    setGameComplete(false);
    setShowWhaleData(false);

    // Clear user clicks layer
    if (mapRef.current && mapReadyRef.current) {
      const map = mapRef.current;
      const userClicksSource = map.getSource("user-clicks") as maptilersdk.GeoJSONSource | undefined;
      if (userClicksSource) {
        userClicksSource.setData({
          type: "FeatureCollection",
          features: []
        } as any);
      }

      // Hide whale data layer
      map.setLayoutProperty("whale-data", "visibility", "none");
    }
  };

  // Reset game when component unmounts (navigation away)
  // This is handled by the key prop in App.tsx which remounts the component
  useEffect(() => {
    return () => {
      resetGame();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleGuessAgain = () => {
    resetGame();
  };

  return (
    <SimpleGrid
      cols={gameComplete ? 2 : 1}
      spacing="md"
      style={{ width: "100%" }}
    >
      <Paper
        withBorder
        radius="lg"
        p="sm"
        style={{
          background: theme.other?.mapBg ?? "#0b1020",
          height: "calc(100vh - 180px)",
          minHeight: rem(500),
          position: "relative",
          transition: "width 0.5s ease"
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

        {/* Initial Overlay */}
        {!gameStarted && (
          <Box
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              borderRadius: rem(12)
            }}
          >
            <Button size="lg" onClick={handleStartGame}>
              Guess where the whales are
            </Button>
          </Box>
        )}

        {/* Instructions Card */}
        {gameStarted && !gameComplete && (
          <Paper
            withBorder
            p="md"
            radius="md"
            style={{
              position: "absolute",
              bottom: rem(16),
              left: rem(16),
              right: rem(16),
              zIndex: 100,
              backgroundColor: "var(--mantine-color-dark-7)"
            }}
          >
            <Text size="sm">
              Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </Text>
          </Paper>
        )}
      </Paper>

      {/* Success Panel */}
      {gameComplete && (
        <Paper
          withBorder
          p="lg"
          radius="lg"
          style={{
            height: "calc(100vh - 180px)",
            minHeight: rem(500),
            display: "flex",
            flexDirection: "column"
          }}
        >
          <Stack gap="md" style={{ height: "100%" }}>
            <Title order={2} ta="center" style={{ paddingTop: rem(24), paddingBottom: rem(16) }}>
              Bravo!
            </Title>
            <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Text ta="center" size="md">
                Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris.
              </Text>
            </Box>
            <Box style={{ marginTop: "auto", paddingTop: rem(16) }}>
              <Button onClick={handleGuessAgain} fullWidth>
                Guess again
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}
    </SimpleGrid>
  );
}

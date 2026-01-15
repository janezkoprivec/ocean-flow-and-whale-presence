import { useEffect, useRef, useState } from "react";
import {
  Box,
  Card,
  Group,
  Paper,
  rem,
  ScrollArea,
  Stack,
  Text,
  Title
} from "@mantine/core";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type SpeciesStats = {
  species: string;
  scientific_name: string;
  count_2011: number;
  description: string;
};

type ChartDataItem = {
  name: string;
  value: number;
  color: string;
  index: number;
};

function getSpeciesImage(scientificName: string) {
  const fileName = scientificName
    .toLowerCase()
    .replace(/\s+/g, "_");

  return new URL(
    `../assets/pics/${fileName}.jpg`,
    import.meta.url
  ).href;
}


export default function StatsBySpecies() {
  const [speciesData, setSpeciesData] = useState<SpeciesStats[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [chartRotation, setChartRotation] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load species data
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/data/species_stats_2011_merged.json");
        const data: SpeciesStats[] = await res.json();
        if (!cancelled) {
          setSpeciesData(data);
          cardRefs.current = new Array(data.length).fill(null);
        }
      } catch (error) {
        console.error("Failed to load species data:", error);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Calculate rotation based on active index
  // PieChart starts at 90° (right side) by default
  // Each slice is 360 / totalSpecies degrees
  // We want to rotate so the active slice's center aligns with the top (0°)
  useEffect(() => {
    if (!speciesData || speciesData.length === 0) return;
    const anglePerSlice = 360 / speciesData.length;
    // Active slice starts at: 90° + (activeIndex * anglePerSlice)
    // Active slice center is at: 90° + (activeIndex * anglePerSlice) + (anglePerSlice / 2)
    // To bring center to top (0°), we rotate backwards by that amount
    const sliceCenterAngle = 90 + (activeIndex * anglePerSlice) + (anglePerSlice / 2);
    const rotation = -sliceCenterAngle; // Rotate backwards to bring slice center to top
    setChartRotation(rotation);
  }, [activeIndex, speciesData]);

  // Setup IntersectionObserver to detect centered card
  useEffect(() => {
    if (!speciesData || speciesData.length === 0) return;

    const observerOptions = {
      root: null, // Use viewport as root
      rootMargin: "-40% 0px -40% 0px", // Consider centered if in middle 20% of viewport
      threshold: [0, 0.25, 0.5, 0.75, 1]
    };
    
    const observer = new IntersectionObserver((entries) => {
      // Find the entry closest to the viewport center
      let closestIndex: number | null = null;
      let closestDistance = Infinity;
      const viewportCenter = window.innerHeight / 2;
      
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = cardRefs.current.indexOf(entry.target as HTMLDivElement);
          if (index !== -1) {
            // Check if card is actually in the center of viewport
            const rect = entry.boundingClientRect;
            const cardCenter = rect.top + rect.height / 2;
            const distanceFromCenter = Math.abs(cardCenter - viewportCenter);
            
            if (distanceFromCenter < closestDistance) {
              closestDistance = distanceFromCenter;
              closestIndex = index;
            }
          }
        }
      });

      if (closestIndex !== null && closestIndex !== activeIndex) {
        setActiveIndex(closestIndex);
      }
    }, observerOptions);

    // Observe all cards after a small delay to ensure they're rendered
    const timeoutId = setTimeout(() => {
      cardRefs.current.forEach((card) => {
        if (card) {
          observer.observe(card);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      cardRefs.current.forEach((card) => {
        if (card) {
          observer.unobserve(card);
        }
      });
    };
  }, [speciesData, activeIndex]);

  // Create whale SVG icon (light blue, same as WhaleGuessingGame)
  const whaleIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg fill="#04ffff" height="800px" width="800px" version="1.1" xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 300.086 300.086" xml:space="preserve">
<path fill="#04ffff" d="M252.472,129.074c-35.063,1.018-81.701,5.444-133.099,14.293c-51.4,8.846-62.426-5.467-67.398-21.439
  c-5.63-18.084,0.212-27.206,0.212-27.206c33.263-5.405,36.17-26.597,35.337-38.658c-3.323,4.165-8.413,6.899-12.634,7.058
  c-3.024,0.11-12.306-9.346-27.274,5.832c0.834-8.314-3.143-13.805-13.254-16.631C23.987,49.41,16.032,63.42,0.223,49.414
  c-3.326,44.068,31.594,45.308,31.594,45.308c-14.225,78.259,45.009,118.089,46.028,122.857c1.021,4.759-15.999,9.523-12.938,14.298
  c3.065,4.76,23.83,3.746,36.088,1.354c59.566,15.655,72.466,18.708,143.647,17.031c57.279-1.369,56.638-51.767,54.944-69.499
  C296.259,145.907,287.535,128.051,252.472,129.074z"/>
</svg>`;

  const whaleIconDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(whaleIconSvg)}`;

  // Prepare chart data
  const chartData: ChartDataItem[] = speciesData
    ? speciesData.map((item, index) => {
        // Calculate grey shade based on count (higher count = lighter grey)
        const maxCount = Math.max(...speciesData.map((s) => s.count_2011));
        const normalizedCount = item.count_2011 / maxCount;
        const greyValue = Math.floor(80 + normalizedCount * 60); // Range from 80-140 (darker to lighter grey)
        const greyColor = `rgb(${greyValue}, ${greyValue}, ${greyValue})`;

        return {
          name: item.species,
          value: item.count_2011,
          color: index === activeIndex ? "#04ffff" : greyColor,
          index
        };
      })
    : [];

  if (!speciesData) {
    return (
      <Paper withBorder p="md" radius="lg">
        <Text>Loading species data...</Text>
      </Paper>
    );
  }
  const activeCount = speciesData[activeIndex]?.count_2011 ?? 0;

  return (
    <Group gap="lg" align="stretch" style={{ height: "calc(100vh - 180px)", minHeight: rem(500) }} wrap="nowrap">
      {/* Left Panel: Scrollable Species List (60% width) */}
      <Paper
        withBorder
        p="md"
        radius="lg"
        style={{
          flex: "0 0 60%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden"
        }}
      >
        <Title order={2} mb="md" c="white">
          Species Statistics
        </Title>
        <ScrollArea
          style={{ flex: 1 }}
          viewportRef={scrollContainerRef}
        >
          <Stack gap="md">
            {speciesData.map((species, index) => (
              <Card
                key={index}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                withBorder
                p="md"
                radius="md"
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s",
                  borderColor: index === activeIndex ? "#04ffff" : undefined,
                  borderWidth: index === activeIndex ? 2 : 1
                }}
              >
                <Group gap="md" align="flex-start" wrap="nowrap" style={{ width: "100%" }}>
                  {/* Whale Icon */}
                  <Box
                    style={{
                      width: rem(80),
                      minWidth: rem(80),
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "flex-start",
                      alignSelf: "stretch"
                    }}
                  >
                    <img
                      src={getSpeciesImage(species.scientific_name)}
                      alt={species.scientific_name}
                      style={{
                        width: "100%",
                        height: rem(80),
                        objectFit: "contain",
                        borderRadius: rem(6)
                      }}
                      onError={(e) => {
                        // Optional fallback if image is missing
                        (e.currentTarget as HTMLImageElement).src = whaleIconDataUri;
                      }}
                    />

                  </Box>

                  {/* Text Content */}
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Title order={4} fw={700} style={{ lineHeight: 1.2 }} c="white">
                      {species.species}
                    </Title>
                    <Text size="sm" fs="italic" c="white" style={{ lineHeight: 1.3 }}>
                      {species.scientific_name}
                    </Text>
                    <Text size="sm" style={{ lineHeight: 1.5, marginTop: rem(4) }} c="white">
                      {species.description}
                    </Text>
                  </Stack>
                </Group>
              </Card>
            ))}
          </Stack>
        </ScrollArea>
      </Paper>

      {/* Right Panel: Fixed Circular Histogram (40% width) */}
      <Paper
        withBorder
        p="md"
        radius="lg"
        style={{
          flex: "0 0 40%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        }}
      >
        <Stack align="center" gap="xs" style={{ width: "100%", height: "100%" }}>
        <Box
          style={{
            width: "100%",
            height: "100%",
            display: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative"
          }}
        >
            <Text size={rem(32)} fs="bold" c="white" ta="center">
              {activeCount}
            </Text>
            <Text size="sm" c="white" ta="center">
              sightings in 2011
            </Text>
          <Box
            style={{
              width: "90%",
              height: "90%",
              maxWidth: rem(500),
              maxHeight: rem(500),
              alignContent: "center",
              justifyContent: "center",
              transition: "transform 0.5s ease",
              transform: `rotate(${chartRotation}deg)`
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="30%"
                  outerRadius="80%"
                  paddingAngle={1}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  label={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} strokeWidth={index === activeIndex ? 2 : 0} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Box>
        </Stack>
      </Paper>
    </Group>
  );
}

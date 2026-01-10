import { useState } from "react";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  ActionIcon,
  Container,
  MantineProvider,
  Stack,
  Title,
  Text,
  Box,
  rem
} from "@mantine/core";
import { theme } from "./theme";
import OceanFlowMap from "./components/OceanFlowMap";
import WhaleGuessingGame from "./components/WhaleGuessingGame";
import StatsBySpecies from "./components/StatsBySpecies";
import WhalePresenceGame from "./components/WhalePresence";
import DetailedOverviewBySpecies from "./components/DetailedOverviewBySpecies";

const COMPONENTS = [
  { label: "Ocean Flow Map", component: OceanFlowMap },
  { label: "Detailed Overview", component: DetailedOverviewBySpecies },
  { label: "Whale Guessing Game", component: WhaleGuessingGame },
  { label: "Stats by Species", component: StatsBySpecies },
  { label: "Whale Presence", component: WhalePresenceGame }
];

export default function App() {
  const [activeStep, setActiveStep] = useState(0);

  const nextStep = () => {
    setActiveStep(prev => Math.min(prev + 1, COMPONENTS.length - 1));
  };

  const prevStep = () => {
    setActiveStep(prev => Math.max(prev - 1, 0));
  };

  const CurrentComponent = COMPONENTS[activeStep].component;

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Box w="100%" py="lg">
        <Title
          ta="center"
          m={0}
          style={{
            fontSize: 96,
            color: "white",
            fontFamily: "Molen Friend Demo"
          }}
        >
          Ocean Flow &amp; Whale Presence
        </Title>
      </Box>

      <Container size="xl" px="md" py="lg">
        <Stack gap={0}>
          <Box
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "12px",
              flexWrap: "nowrap",
              padding: "20px 8px",
              width: "100%"
            }}
          >
            <ActionIcon
              variant="filled"
              size="lg"
              radius="xl"
              onClick={prevStep}
              disabled={activeStep === 0}
              style={{
                flexShrink: 0,
                transition: "all 0.3s ease"
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </ActionIcon>

            <Box
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "4px",
                flexWrap: "nowrap",
                flex: "1 1 auto",
                overflowX: "auto",
                scrollbarWidth: "none",
                msOverflowStyle: "none"
              }}
              className="stepper-container"
            >
              {COMPONENTS.map((item, index) => {
              const isActive = index === activeStep;
              const isCompleted = index < activeStep;
              
              return (
                <Box
                  key={index}
                  onClick={() => setActiveStep(index)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: isActive ? "scale(1)" : "scale(0.75)",
                    opacity: isActive ? 1 : 0.65,
                    flex: isActive ? "1 1 auto" : "0 0 auto",
                    minWidth: isActive ? "150px" : "80px",
                    maxWidth: isActive ? "180px" : "100px",
                    padding: isActive ? "14px 18px" : "10px 12px",
                    borderRadius: "12px",
                    background: isActive
                      ? "var(--mantine-color-blue-9)"
                      : isCompleted
                      ? "var(--mantine-color-blue-7)"
                      : "var(--mantine-color-dark-6)",
                    border: isActive
                      ? "2px solid var(--mantine-color-blue-6)"
                      : "2px solid transparent",
                    position: "relative",
                    boxShadow: isActive
                      ? "0 4px 12px rgba(37, 99, 235, 0.3)"
                      : "0 2px 4px rgba(0, 0, 0, 0.1)"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = "scale(0.85)";
                      e.currentTarget.style.opacity = "0.8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.transform = "scale(0.75)";
                      e.currentTarget.style.opacity = "0.65";
                    }
                  }}
                >
                  <Box
                    style={{
                      width: isActive ? "36px" : "20px",
                      height: isActive ? "36px" : "20px",
                      borderRadius: "50%",
                      background: isActive
                        ? "var(--mantine-color-blue-6)"
                        : isCompleted
                        ? "var(--mantine-color-blue-5)"
                        : "var(--mantine-color-dark-4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: isActive ? "10px" : "6px",
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      fontWeight: "bold",
                      fontSize: isActive ? "16px" : "11px",
                      color: "white",
                      flexShrink: 0
                    }}
                  >
                    {isCompleted ? "✓" : index + 1}
                  </Box>
                  <Text
                    size={isActive ? "sm" : "xs"}
                    fw={isActive ? 600 : 400}
                    ta="center"
                    style={{
                      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      lineHeight: 1.3,
                      color: "white",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      width: "100%"
                    }}
                  >
                    {item.label}
                  </Text>
                  {index < COMPONENTS.length - 1 && (
                    <Box
                      style={{
                        position: "absolute",
                        right: "-8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: "12px",
                        height: "2px",
                        background: isCompleted || isActive
                          ? "var(--mantine-color-blue-6)"
                          : "var(--mantine-color-dark-4)",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        zIndex: 0
                      }}
                    />
                  )}
                </Box>
              );
            })}
            </Box>

            <ActionIcon
              variant="filled"
              size="lg"
              radius="xl"
              onClick={nextStep}
              disabled={activeStep === COMPONENTS.length - 1}
              style={{
                flexShrink: 0,
                transition: "all 0.3s ease"
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </ActionIcon>
          </Box>

          <Box
            style={{
              minHeight: "60vh",
              animation: "fadeIn 0.4s ease-in-out"
            }}
          >
            {activeStep === 2 ? (
              <WhaleGuessingGame key={activeStep} />
            ) : (
              <CurrentComponent />
            )}
          </Box>
        </Stack>
      </Container>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .stepper-container::-webkit-scrollbar {
          display: none;
        }
        .stepper-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </MantineProvider>
  );
}

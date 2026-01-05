import { createTheme } from "@mantine/core";

export const theme = createTheme({
  fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
  defaultRadius: "md",
  primaryColor: "blue",
  defaultGradient: { from: "cyan", to: "blue", deg: 135 },
  colors: {
    dark: [
      "#0b1020",
      "#0f162b",
      "#152038",
      "#1b2a45",
      "#223652",
      "#29435f",
      "#31506d",
      "#3a5e7b",
      "#446c89",
      "#4e7b98"
    ]
  },
  other: {
    mapBg: "#0b1020"
  }
});

import { Paper, Stack, Text, Title } from "@mantine/core";

export default function WhalesSalinityTemp() {
  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="xs">
        <Title order={4}>Whales, Salinity &amp; Temperature</Title>
        <Text c="dimmed" size="sm">
          Placeholder for comparing whale observations with salinity and temperature layers.
        </Text>
      </Stack>
    </Paper>
  );
}


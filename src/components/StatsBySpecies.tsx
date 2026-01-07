import { Paper, Stack, Text, Title } from "@mantine/core";

export default function StatsBySpecies() {
  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="xs">
        <Title order={4}>Stats by Species</Title>
        <Text c="dimmed" size="sm">
          Placeholder for per-species statistics such as encounter counts and seasonality.
        </Text>
      </Stack>
    </Paper>
  );
}


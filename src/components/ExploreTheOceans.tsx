import { Paper, Stack, Text, Title } from "@mantine/core";

export default function ExploreTheOceans() {
  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="xs">
        <Title order={4}>Explore the Oceans</Title>
        <Text c="dimmed" size="sm">
          Placeholder for an overview panel to browse ocean regions and related datasets.
        </Text>
      </Stack>
    </Paper>
  );
}


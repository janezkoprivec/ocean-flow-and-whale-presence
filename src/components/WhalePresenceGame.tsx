import { Paper, Stack, Text, Title } from "@mantine/core";

export default function WhalePresenceGame() {
  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="xs">
        <Title order={4}>Whale Presence Game</Title>
        <Text c="dimmed" size="sm">
          Placeholder for a game exploring where whales are likely to appear on the map.
        </Text>
      </Stack>
    </Paper>
  );
}


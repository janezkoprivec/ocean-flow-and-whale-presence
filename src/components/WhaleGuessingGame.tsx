import { Paper, Stack, Text, Title } from "@mantine/core";

export default function WhaleGuessingGame() {
  return (
    <Paper withBorder p="md" radius="lg">
      <Stack gap="xs">
        <Title order={4}>Whale Guessing Game</Title>
        <Text c="dimmed" size="sm">
          Placeholder for an interactive quiz where users guess whale species from clues.
        </Text>
      </Stack>
    </Paper>
  );
}


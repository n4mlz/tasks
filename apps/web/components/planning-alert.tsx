"use client";

import * as React from "react";
import { Box, Link as ChakraLink, Stack, Text } from "@chakra-ui/react";
import NextLink from "next/link";
import { formatHoursFromMinutes, formatJapaneseDate } from "../lib/presentation";

type PlanningHealthPayload = {
  missingCapacityDatesWithin7Days: string[];
  hasInsufficientCapacity?: boolean;
  shortfallMinutes?: number;
  horizonEnd?: string;
};

function formatDateRanges(dates: string[]): string {
  const sorted = [...new Set(dates)].sort();
  const ranges: Array<[string, string]> = [];

  for (const date of sorted) {
    const current = new Date(`${date}T00:00:00.000Z`);
    const previousRange = ranges.at(-1);
    const previous = previousRange ? new Date(`${previousRange[1]}T00:00:00.000Z`) : null;
    const daysApart = previous ? (current.getTime() - previous.getTime()) / 86_400_000 : 0;

    if (previousRange && daysApart === 1) previousRange[1] = date;
    else ranges.push([date, date]);
  }

  return ranges
    .map(([start, end]) => start === end
      ? formatJapaneseDate(start, true)
      : `${formatJapaneseDate(start, true)}〜${formatJapaneseDate(end, true)}`)
    .join("、");
}

export function PlanningAlert({
  initialHealth,
}: Readonly<{ initialHealth: PlanningHealthPayload }>) {
  const [health, setHealth] = React.useState(initialHealth);

  React.useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/planning-health", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as PlanningHealthPayload;
        if (active) setHealth(payload);
      } catch {
        // Keep the server-rendered planning status when refresh fails.
      }
    };

    window.addEventListener("task-platform:planning-changed", refresh);
    return () => {
      active = false;
      window.removeEventListener("task-platform:planning-changed", refresh);
    };
  }, []);

  if (health.missingCapacityDatesWithin7Days.length === 0 && !health.hasInsufficientCapacity) {
    return null;
  }

  return (
    <Box
      role="status"
      borderWidth="1px"
      borderColor="#e9c886"
      borderRadius="xl"
      bg="#fff9ea"
      px={{ base: "4", md: "5" }}
      py="4"
    >
      <Text fontWeight="650" color="#624919">
        計画の確認が必要です
      </Text>
      <Stack mt="1.5" gap="1" color="#715d37" fontSize="sm">
        {health.missingCapacityDatesWithin7Days.length > 0 ? (
          <Text>
            余力時間が未設定: {formatDateRanges(health.missingCapacityDatesWithin7Days)}
          </Text>
        ) : null}
        {health.hasInsufficientCapacity ? (
          <Text>
            余力時間が少なくとも {formatHoursFromMinutes(health.shortfallMinutes ?? 0)} 不足しています
            {health.horizonEnd ? `（${formatJapaneseDate(health.horizonEnd)}まで）` : ""}。
          </Text>
        ) : null}
        <ChakraLink asChild color="#315f58" fontWeight="600" textDecoration="underline">
          <NextLink href="/week">計画を確認する</NextLink>
        </ChakraLink>
      </Stack>
    </Box>
  );
}

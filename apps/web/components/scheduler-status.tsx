"use client";

import * as React from "react";
import { Badge, Box, HStack, Link as ChakraLink, Text } from "@chakra-ui/react";
import NextLink from "next/link";

type SchedulerStatusPayload = {
  schedulerStatus: "idle" | "pending" | "running" | "failed";
  hasPendingChanges: boolean;
};

function getStatusPresentation(status: SchedulerStatusPayload | null) {
  if (!status) return { label: "状態を確認中", colorPalette: "gray" };
  if (status.schedulerStatus === "failed") return { label: "配分を確認", colorPalette: "red" };
  if (status.schedulerStatus === "running") return { label: "再配分中", colorPalette: "blue" };
  if (status.hasPendingChanges) return { label: "再配分待ち", colorPalette: "orange" };
  return { label: "配分済み", colorPalette: "green" };
}

export function SchedulerStatus() {
  const [status, setStatus] = React.useState<SchedulerStatusPayload | null>(null);

  React.useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/scheduler/status", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as SchedulerStatusPayload;
        if (active) setStatus(payload);
      } catch {
        if (active) setStatus(null);
      }
    };

    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const presentation = getStatusPresentation(status);

  return (
    <ChakraLink asChild _hover={{ textDecoration: "none" }}>
      <NextLink href="/dashboard?view=history" aria-label="再配分の状態と履歴">
        <HStack
          w={{ base: "auto", md: "full" }}
          minH="10"
          justify={{ base: "center", md: "flex-start" }}
          gap="2"
          borderRadius="lg"
          px={{ base: "2.5", md: "3" }}
          py="2"
          bg={{ base: "#f4f7f6", md: "#f6f8f7" }}
          color="#405453"
          _hover={{ bg: "#edf3f1" }}
        >
          <Box boxSize="2" borderRadius="full" bg={presentation.colorPalette + ".500"} />
          <Badge colorPalette={presentation.colorPalette} variant="subtle" fontWeight="600">
            {presentation.label}
          </Badge>
          <Text display={{ base: "none", md: "block" }} ml="auto" fontSize="xs" color="#788783">
            履歴
          </Text>
        </HStack>
      </NextLink>
    </ChakraLink>
  );
}

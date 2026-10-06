import type { ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";

export function MetricCard({
  label,
  value,
  hint,
}: Readonly<{
  label: string;
  value: ReactNode;
  hint?: string;
}>) {
  return (
    <Box borderWidth="1px" borderColor="#e2e9e6" borderRadius="xl" bg="white" px="4" py="3.5">
      <Text fontSize="xs" fontWeight="600" color="#71807e">{label}</Text>
      <Text mt="1" fontSize="xl" fontWeight="650" letterSpacing="-0.03em" color="#263a37">{value}</Text>
      {hint ? <Text mt="1" fontSize="xs" color="#71807e">{hint}</Text> : null}
    </Box>
  );
}

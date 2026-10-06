"use client";

import { Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatJapaneseDate } from "../lib/presentation";

type DateNavigationProps = { date: string };

export function DateNavigation({ date }: DateNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(direction: -1 | 1) {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + direction);
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value.toISOString().slice(0, 10));
    router.push(`/?${params.toString()}`);
  }

  function goToToday() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("date");
    router.push(params.size > 0 ? `/?${params.toString()}` : "/");
  }

  const label = formatJapaneseDate(date, true);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Flex align="center" gap="1.5" flexWrap="wrap">
      <IconButton
        aria-label="前日"
        onClick={() => navigate(-1)}
        size="sm"
        variant="outline"
        borderColor="#d9e1df"
      >
        <ChevronLeft size={17} />
      </IconButton>
      <Text minW="20" textAlign="center" fontSize="sm" fontWeight="600" color="#455654">
        {label}
      </Text>
      {date !== today ? (
        <Button onClick={goToToday} size="sm" variant="outline" borderColor="#d9e1df">
          今日
        </Button>
      ) : null}
      <IconButton
        aria-label="翌日"
        onClick={() => navigate(1)}
        size="sm"
        variant="outline"
        borderColor="#d9e1df"
      >
        <ChevronRight size={17} />
      </IconButton>
    </Flex>
  );
}

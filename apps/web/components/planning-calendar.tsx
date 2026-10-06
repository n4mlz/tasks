"use client";

import * as React from "react";
import {
  Box,
  Button,
  Flex,
  Grid,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Modal } from "./ui/modal";
import { formatJapaneseDate } from "../lib/presentation";

type PlanningCalendarPayload = {
  referenceDate: string;
  monthLabel: string;
  calendarDays: string[];
  monthStart: string;
  monthEnd: string;
  capacities: Array<{ date: string; availableMinutes: number }>;
  slicesByDate: Record<string, Array<{ taskTitle: string; plannedMinutes: number }>>;
};

type PlanningCalendarProps = { initialPayload: PlanningCalendarPayload; today: string };
type SelectedDay = {
  date: string;
  availableMinutes: number;
  tasks: Array<{ taskTitle: string; plannedMinutes: number }>;
};

function shiftMonth(referenceDate: string, months: number): string {
  const value = new Date(`${referenceDate.slice(0, 7)}-01T00:00:00.000Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function hours(minutes: number): string {
  const value = minutes / 60;
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function PlanningCalendar({ initialPayload, today }: PlanningCalendarProps) {
  const [payload, setPayload] = React.useState(initialPayload);
  const [jumpDate, setJumpDate] = React.useState(initialPayload.referenceDate);
  const [loading, setLoading] = React.useState(false);
  const [selectedDay, setSelectedDay] = React.useState<SelectedDay | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const capacityByDate = React.useMemo(
    () => new Map(payload.capacities.map((capacity) => [capacity.date, capacity.availableMinutes])),
    [payload.capacities],
  );

  const loadMonth = React.useCallback(async (referenceDate: string) => {
    if (!referenceDate) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/planning-month?referenceDate=${referenceDate}`, { cache: "no-store" });
      if (!response.ok) throw new Error("failed to load month");
      const nextPayload = (await response.json()) as PlanningCalendarPayload;
      setPayload(nextPayload);
      setJumpDate(nextPayload.referenceDate);
    } catch {
      setError("カレンダーを読み込めませんでした。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }, []);

  function openDay(date: string) {
    setSelectedDay({
      date,
      availableMinutes: capacityByDate.get(date) ?? 0,
      tasks: payload.slicesByDate[date] ?? [],
    });
  }

  const plannedMinutes = selectedDay?.tasks.reduce((sum, task) => sum + task.plannedMinutes, 0) ?? 0;

  return (
    <Stack gap="4" opacity={loading ? 0.65 : 1}>
      <Flex align="center" justify="space-between" gap="3" wrap="wrap">
        <HStack gap="2">
          <IconButton
            aria-label="前の月"
            size="sm"
            variant="outline"
            borderColor="#d5dfdc"
            onClick={() => void loadMonth(shiftMonth(payload.referenceDate, -1))}
          >
            <ChevronLeft size={18} />
          </IconButton>
          <Text minW="24" textAlign="center" fontSize="lg" fontWeight="650" color="#263a37">
            {payload.monthLabel}
          </Text>
          <IconButton
            aria-label="次の月"
            size="sm"
            variant="outline"
            borderColor="#d5dfdc"
            onClick={() => void loadMonth(shiftMonth(payload.referenceDate, 1))}
          >
            <ChevronRight size={18} />
          </IconButton>
        </HStack>
        <Button size="sm" variant="outline" borderColor="#d5dfdc" onClick={() => void loadMonth(today)}>
          今月へ
        </Button>
      </Flex>

      <Flex as="form" align="end" gap="2" wrap="wrap" onSubmit={(event) => {
        event.preventDefault();
        void loadMonth(jumpDate);
      }}>
        <label style={{ flex: "1 1 10rem" }}>
          <Text mb="1" fontSize="xs" fontWeight="600" color="#71807e">日付へ移動</Text>
          <Input
            aria-label="日付へ移動"
            type="date"
            value={jumpDate}
            onChange={(event) => setJumpDate(event.target.value)}
            borderColor="#d5dfdc"
            bg="white"
          />
        </label>
        <Button type="submit" variant="outline" borderColor="#d5dfdc">移動</Button>
      </Flex>

      {error ? <Text role="alert" color="red.700" fontSize="sm">{error}</Text> : null}

      <Grid
        templateColumns="repeat(7, minmax(0, 1fr))"
        gap="0"
        borderWidth="1px"
        borderColor="#dce5e2"
        borderRadius="lg"
        overflow="hidden"
      >
        {["月", "火", "水", "木", "金", "土", "日"].map((day, index) => (
          <Text
            key={day}
            py="1.5"
            textAlign="center"
            fontSize="xs"
            fontWeight="600"
            color="#73817e"
            bg="#f7f9f8"
            borderRightWidth={index === 6 ? "0" : "1px"}
            borderBottomWidth="1px"
            borderColor="#dce5e2"
          >
            {day}
          </Text>
        ))}
        {payload.calendarDays.map((date, index) => {
          const capacity = capacityByDate.get(date) ?? 0;
          const assigned = payload.slicesByDate[date] ?? [];
          const inMonth = date >= payload.monthStart && date <= payload.monthEnd;
          const isToday = date === today;
          const allocated = assigned.reduce((sum, item) => sum + item.plannedMinutes, 0);
          return (
            <Button
              key={date}
              type="button"
              variant="plain"
              aria-label={`${date}、余力 ${capacity > 0 ? `${hours(capacity)}時間` : "未設定"}、予定 ${hours(allocated)}時間`}
              onClick={() => openDay(date)}
              display="flex"
              minW="0"
              h={{ base: "16", sm: "20", lg: "24" }}
              p={{ base: "1", sm: "2" }}
              flexDir="column"
              alignItems="center"
              justifyContent="center"
              gap="1"
              borderWidth="0"
              borderRightWidth={index % 7 === 6 ? "0" : "1px"}
              borderBottomWidth={index >= payload.calendarDays.length - 7 ? "0" : "1px"}
              borderColor="#dce5e2"
              borderRadius="0"
              bg={isToday ? "#eaf3f0" : inMonth ? "white" : "#f4f6f5"}
              color={inMonth ? "#3d504d" : "#9ba6a3"}
              fontWeight={isToday ? "700" : "500"}
              boxShadow={isToday ? "inset 0 0 0 1px #4d8d82" : undefined}
              _hover={{ bg: isToday ? "#e1efeb" : "#f0f6f4" }}
            >
              <Text fontSize={{ base: "xs", sm: "sm" }}>{Number(date.slice(8, 10))}</Text>
              <Text fontSize={{ base: "10px", sm: "xs" }} color={capacity ? "#376b61" : "#9ba6a3"}>
                {capacity ? `${hours(capacity)}h` : "—"}
              </Text>
              {assigned.length > 0 ? <Box w="1.5" h="1.5" borderRadius="full" bg="#418478" aria-hidden="true" /> : null}
            </Button>
          );
        })}
      </Grid>

      <Flex gap="2" flexWrap="wrap" fontSize="xs" color="#71807e">
        <Box w="1.5" h="1.5" borderRadius="full" bg="#418478" />
        <Text>予定がある日</Text>
        <Text>数字は余力時間、— は未設定</Text>
        <Text>日付を選ぶと余力時間と配分を編集できます。</Text>
      </Flex>

      <Modal
        open={selectedDay !== null}
        onOpenChange={(open) => { if (!open) setSelectedDay(null); }}
        title={selectedDay ? formatJapaneseDate(selectedDay.date, true) : "日付"}
        description={selectedDay ? `予定 ${hours(plannedMinutes)}時間` : undefined}
      >
        {selectedDay ? (
          <CalendarEditForm
            key={selectedDay.date}
            date={selectedDay.date}
            availableHours={selectedDay.availableMinutes ? hours(selectedDay.availableMinutes) : ""}
            tasks={selectedDay.tasks}
            onSaved={async () => {
              setSelectedDay(null);
              await loadMonth(payload.referenceDate);
              window.dispatchEvent(new Event("task-platform:planning-changed"));
            }}
          />
        ) : null}
      </Modal>
    </Stack>
  );
}

function CalendarEditForm({
  date,
  availableHours,
  tasks,
  onSaved,
}: {
  date: string;
  availableHours: string;
  tasks: Array<{ taskTitle: string; plannedMinutes: number }>;
  onSaved: () => Promise<void> | void;
}) {
  const [hoursValue, setHoursValue] = React.useState(availableHours);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState(false);
  const planned = tasks.reduce((sum, task) => sum + task.plannedMinutes, 0);

  return (
    <Box as="form" onSubmit={async (event) => {
      event.preventDefault();
      setSaving(true);
      setError(false);
      try {
        const response = await fetch("/api/capacity", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ date, availableMinutes: Number(hoursValue || "0") }),
        });
        if (!response.ok) throw new Error("failed to save capacity");
        await onSaved();
      } catch {
        setError(true);
      } finally {
        setSaving(false);
      }
    }}>
      <Stack gap="5">
        {error ? <Text role="alert" fontSize="sm" color="red.700">保存できませんでした。もう一度お試しください。</Text> : null}
        <Box>
          <Text fontSize="sm" color="#71807e">この日に使える時間</Text>
          <Flex align="center" gap="2" mt="2">
            <Input
              aria-label="余力時間（時間）"
              inputMode="decimal"
              min="0"
              step="0.25"
              type="number"
              value={hoursValue}
              onChange={(event) => setHoursValue(event.target.value)}
              placeholder="0"
              borderColor="#d5dfdc"
            />
            <Text color="#71807e">時間</Text>
          </Flex>
        </Box>
        <Box>
          <Text fontSize="sm" color="#71807e">予定時間: {hours(planned)}時間</Text>
          {tasks.length > 0 ? (
            <Stack mt="2" gap="2">
              {tasks.map((task) => (
                <Flex key={`${task.taskTitle}-${task.plannedMinutes}`} justify="space-between" gap="3" borderBottomWidth="1px" borderColor="#edf0ef" pb="2">
                  <Text fontSize="sm" color="#344845" overflowWrap="anywhere">{task.taskTitle}</Text>
                  <Text flexShrink="0" fontSize="sm" color="#667673">{hours(task.plannedMinutes)}時間</Text>
                </Flex>
              ))}
            </Stack>
          ) : <Text mt="2" fontSize="sm" color="#8a9693">この日の予定はありません。</Text>}
        </Box>
        <Button type="submit" colorPalette="teal" loading={saving} alignSelf="flex-end">余力時間を保存</Button>
      </Stack>
    </Box>
  );
}

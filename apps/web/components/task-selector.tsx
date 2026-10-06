"use client";

import { Box, NativeSelect, Text } from "@chakra-ui/react";
import { useRouter, useSearchParams } from "next/navigation";

export function TaskSelector({
  tasks,
  selectedTaskId,
}: Readonly<{ tasks: Array<{ id: string; title: string }>; selectedTaskId: string }>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Box maxW={{ base: "full", sm: "28rem" }}>
      <Text mb="1.5" fontSize="sm" fontWeight="600" color="#415552">タスクを選ぶ</Text>
      <NativeSelect.Root>
        <NativeSelect.Field
          aria-label="タスクを選ぶ"
          value={selectedTaskId}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams.toString());
            next.set("taskId", event.target.value);
            router.push(`/dashboard?${next.toString()}`);
          }}
          bg="white"
          borderColor="#d5dfdc"
        >
          {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
    </Box>
  );
}

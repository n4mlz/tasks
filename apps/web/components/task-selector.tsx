"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "./ui/select";

export function TaskSelector({
  tasks,
  selectedTaskId,
}: Readonly<{
  tasks: Array<{ id: string; title: string }>;
  selectedTaskId: string;
}>) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <label className="grid gap-2 text-sm text-slate-700">
      <span className="font-medium text-slate-900">タスク</span>
      <Select
        aria-label="タスク"
        value={selectedTaskId}
        onChange={(event) => {
          const next = new URLSearchParams(searchParams?.toString() ?? "");
          next.set("taskId", event.target.value);
          router.push(`/dashboard?${next.toString()}`);
        }}
      >
        {tasks.map((task) => (
          <option key={task.id} value={task.id}>
            {task.title}
          </option>
        ))}
      </Select>
    </label>
  );
}

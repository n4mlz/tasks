"use client";

import * as React from "react";
import { WorkLogDialog } from "./work-log-dialog";

export function QuickWorkLog({
  tasks,
  date,
}: Readonly<{
  tasks: Array<{ id: string; title: string; remainingMinutes: number }>;
  date: string;
}>) {
  const [selectedTaskId, setSelectedTaskId] = React.useState(tasks[0]?.id ?? "");

  React.useEffect(() => {
    if (!tasks.some((task) => task.id === selectedTaskId)) {
      setSelectedTaskId(tasks[0]?.id ?? "");
    }
  }, [selectedTaskId, tasks]);

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  if (!selectedTask) {
    return null;
  }

  return (
    <WorkLogDialog
      date={date}
      defaultRemainingHours={selectedTask.remainingMinutes / 60}
      onSelectedTaskIdChange={setSelectedTaskId}
      selectableTasks={tasks.map((task) => ({ id: task.id, title: task.title }))}
      selectedTaskId={selectedTaskId}
      taskId={selectedTask.id}
      title={selectedTask.title}
      triggerLabel="他の task を記録"
    />
  );
}

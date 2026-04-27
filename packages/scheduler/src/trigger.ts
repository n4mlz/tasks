export async function scheduleAfterTaskMutation(
  generate: (reason: string) => Promise<void>,
  reason: "task_created" | "task_updated" | "work_logged" | "capacity_updated" | "manual",
): Promise<void> {
  await generate(reason);
}

import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const json = await request.json();

  await taskPlatform.updateTask({
    taskId: params.taskId,
    title: typeof json.title === "string" ? json.title : undefined,
    remainingMinutes:
      json.remainingMinutes === undefined ? undefined : Number(json.remainingMinutes),
    dueDate:
      json.dueDate === undefined
        ? undefined
        : json.dueDate === null
          ? null
          : String(json.dueDate),
    urgency: json.urgency,
    status: json.status,
    notes: typeof json.notes === "string" ? json.notes : undefined,
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

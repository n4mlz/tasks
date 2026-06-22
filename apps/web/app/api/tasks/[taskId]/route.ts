import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";
import { hoursToMinutes } from "../../../../lib/presentation";

async function applyTaskUpdate(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
  method: "PATCH" | "POST",
) {
  const params = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const done =
    json.done === true ||
    json.done === "true" ||
    json.done === "on" ||
    Number(json.remainingMinutes) === 0;

  await taskPlatform.updateTask({
    taskId: params.taskId,
    title: typeof json.title === "string" ? json.title : undefined,
    remainingMinutes:
      json.remainingMinutes === undefined
        ? undefined
        : hoursToMinutes(Number(json.remainingMinutes)),
    dueDate:
      json.dueDate === undefined
        ? undefined
        : json.dueDate === null
          ? null
          : String(json.dueDate),
    urgency: json.urgency,
    taskType: json.taskType,
    cognitiveLoad: json.cognitiveLoad,
    energy: json.energy,
    tags: Array.isArray(json.tags)
      ? json.tags.filter((value: unknown): value is string => typeof value === "string")
      : undefined,
    status: done ? "done" : "active",
    notes: typeof json.notes === "string" ? json.notes : undefined,
  });

  if (method === "POST") {
    return NextResponse.redirect("/inbox", { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  return applyTaskUpdate(request, context, "PATCH");
}

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  return applyTaskUpdate(request, context, "POST");
}

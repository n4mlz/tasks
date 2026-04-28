import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

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
    taskType: json.taskType,
    energy: json.energy,
    status: json.status,
    notes: typeof json.notes === "string" ? json.notes : undefined,
  });

  if (method === "POST") {
    return NextResponse.redirect(new URL("/inbox", request.url), { status: 303 });
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

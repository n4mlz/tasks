import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";
import { hoursToMinutes } from "../../../lib/presentation";

async function readTaskPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }

  const formData = await request.formData();
  return Object.fromEntries(formData.entries());
}

export async function POST(request: Request) {
  const json = await readTaskPayload(request);
  const parsed = {
    title: String(json.title ?? ""),
    remainingMinutes: hoursToMinutes(Number(json.remainingMinutes)),
    dueDate: typeof json.dueDate === "string" && json.dueDate ? json.dueDate : undefined,
    urgency: json.urgency,
    taskType: json.taskType,
    energy: json.energy,
    notes: typeof json.notes === "string" ? json.notes : undefined,
  };

  if (!parsed.title || !Number.isInteger(parsed.remainingMinutes) || parsed.remainingMinutes <= 0) {
    return NextResponse.json({ error: "invalid task payload" }, { status: 400 });
  }

  await taskPlatform.createTask(parsed);

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.redirect(new URL("/inbox", request.url), { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

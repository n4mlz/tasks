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
    cognitiveLoad: json.cognitiveLoad,
    energy: json.energy,
    tags: Array.isArray(json.tags)
      ? json.tags.filter((value: unknown): value is string => typeof value === "string")
      : typeof json.tags === "string" && json.tags
        ? String(json.tags)
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean)
        : undefined,
    notes: typeof json.notes === "string" ? json.notes : undefined,
  };

  if (!parsed.title || !Number.isInteger(parsed.remainingMinutes) || parsed.remainingMinutes <= 0) {
    return NextResponse.json({ error: "invalid task payload" }, { status: 400 });
  }

  await taskPlatform.createTask(parsed);

  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.redirect("/inbox", { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

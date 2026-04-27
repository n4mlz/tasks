import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = {
    title: String(json.title ?? ""),
    remainingMinutes: Number(json.remainingMinutes),
    dueDate: typeof json.dueDate === "string" ? json.dueDate : undefined,
    urgency: json.urgency,
    notes: typeof json.notes === "string" ? json.notes : undefined,
  };

  if (!parsed.title || !Number.isInteger(parsed.remainingMinutes) || parsed.remainingMinutes <= 0) {
    return NextResponse.json({ error: "invalid task payload" }, { status: 400 });
  }

  await taskPlatform.createTask(parsed);

  return NextResponse.json({ ok: true }, { status: 201 });
}

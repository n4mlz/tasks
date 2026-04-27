import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../../lib/task-platform";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const json = await request.json();
  const parsed = {
    taskId: params.taskId,
    date: String(json.date ?? ""),
    spentMinutes: Number(json.spentMinutes),
    remainingMinutesAfter: Number(json.remainingMinutesAfter),
    note: typeof json.note === "string" ? json.note : undefined,
  };

  if (
    !parsed.taskId ||
    !parsed.date ||
    !Number.isInteger(parsed.spentMinutes) ||
    parsed.spentMinutes <= 0 ||
    !Number.isInteger(parsed.remainingMinutesAfter) ||
    parsed.remainingMinutesAfter < 0
  ) {
    return NextResponse.json({ error: "invalid work log payload" }, { status: 400 });
  }

  await taskPlatform.logWork(parsed);

  return NextResponse.json({ ok: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../../lib/task-platform";
import { hoursToMinutes } from "../../../../../lib/presentation";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  const markDone = String(json.markDone ?? "") === "true";
  const parsed = {
    taskId: params.taskId,
    date: String(json.date ?? ""),
    spentMinutes: hoursToMinutes(Number(json.spentMinutes)),
    remainingMinutesAfter: markDone
      ? 0
      : hoursToMinutes(Number(json.remainingMinutesAfter)),
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

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect("/", { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

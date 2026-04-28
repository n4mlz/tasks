import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const proposals = await taskPlatform.listProposals(status);

  return NextResponse.json({ proposals }, { status: 200 });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  const json = contentType.includes("application/json")
    ? await request.json()
    : Object.fromEntries((await request.formData()).entries());
  await taskPlatform.generateSchedule({
    reason:
      json.reason === "task_created" ||
      json.reason === "task_updated" ||
      json.reason === "work_logged" ||
      json.reason === "capacity_updated"
        ? json.reason
        : "manual",
  });

  if (!contentType.includes("application/json")) {
    return NextResponse.redirect(new URL("/proposals", request.url), { status: 303 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

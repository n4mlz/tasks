import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";
  const proposals = await taskPlatform.listProposals(status);

  return NextResponse.json({ proposals }, { status: 200 });
}

export async function POST(request: Request) {
  const json = await request.json();
  await taskPlatform.generateSchedule({
    reason:
      json.reason === "task_created" ||
      json.reason === "task_updated" ||
      json.reason === "work_logged" ||
      json.reason === "capacity_updated"
        ? json.reason
        : "manual",
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

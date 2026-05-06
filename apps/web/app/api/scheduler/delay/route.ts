import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function POST() {
  await taskPlatform.postponeScheduler({
    delayMilliseconds: 3 * 60_000,
  });
  const status = await taskPlatform.getSchedulerStatus();
  return NextResponse.json({ ok: true, status }, { status: 200 });
}

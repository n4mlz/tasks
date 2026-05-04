import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function POST() {
  const tick = await taskPlatform.runSchedulerTick();
  const status = await taskPlatform.getSchedulerStatus();
  return NextResponse.json({ tick, status }, { status: 200 });
}

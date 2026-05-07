import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function POST(request: Request) {
  let force = false;
  try {
    const body = (await request.json()) as { force?: boolean };
    force = body.force === true;
  } catch {
    force = false;
  }

  const tick = await taskPlatform.runSchedulerTick({ force });
  const status = await taskPlatform.getSchedulerStatus();
  return NextResponse.json({ tick, status }, { status: 200 });
}

import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../lib/task-platform";

export async function GET() {
  const status = await taskPlatform.getSchedulerStatus();
  return NextResponse.json(status, { status: 200 });
}

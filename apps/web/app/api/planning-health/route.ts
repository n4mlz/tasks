import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

export async function GET() {
  const planningHealth = await taskPlatform.getPlanningHealth();
  return NextResponse.json(planningHealth, { status: 200 });
}

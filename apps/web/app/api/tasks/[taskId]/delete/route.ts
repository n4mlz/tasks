import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../../lib/task-platform";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const params = await context.params;
  try {
    await taskPlatform.deleteTask({ taskId: params.taskId });
  } catch (error) {
    console.error("[delete-task] failed:", error);
  }
  return NextResponse.redirect(new URL("/inbox", request.url), { status: 303 });
}

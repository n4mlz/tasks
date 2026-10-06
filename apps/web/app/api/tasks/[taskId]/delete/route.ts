import { taskPlatform } from "../../../../../lib/task-platform";
import { redirectAfterPost } from "../../../../../lib/redirect";

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
  return redirectAfterPost("/inbox");
}

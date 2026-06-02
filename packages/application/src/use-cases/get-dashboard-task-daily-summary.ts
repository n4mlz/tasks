import type { DashboardRepository } from "../ports";

export async function getDashboardTaskDailySummaryUseCase(input: {
  dashboardRepository: DashboardRepository;
  taskId: string;
  weekStart: string;
}) {
  return input.dashboardRepository.getTaskDailySummary({
    taskId: input.taskId,
    weekStart: input.weekStart,
  });
}

import type { DashboardRepository } from "../ports";

export async function getDashboardTaskTimelineUseCase(input: {
  dashboardRepository: DashboardRepository;
  taskId: string;
  today: string;
}) {
  return input.dashboardRepository.getTaskTimeline({
    taskId: input.taskId,
    endDate: input.today,
    weeks: 8,
  });
}

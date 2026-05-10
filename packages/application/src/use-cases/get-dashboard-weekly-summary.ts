import type { DashboardRepository } from "../ports";

export async function getDashboardWeeklySummaryUseCase(input: {
  dashboardRepository: DashboardRepository;
  today: string;
}) {
  return input.dashboardRepository.getWeeklySummary({
    endDate: input.today,
    weeks: 8,
  });
}

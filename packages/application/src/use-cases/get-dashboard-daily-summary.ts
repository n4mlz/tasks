import type { DashboardRepository } from "../ports";

export async function getDashboardDailySummaryUseCase(input: {
  dashboardRepository: DashboardRepository;
  weekStart: string;
}) {
  return input.dashboardRepository.getDailySummary({
    weekStart: input.weekStart,
  });
}

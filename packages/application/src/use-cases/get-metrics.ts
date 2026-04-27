export async function getMetricsUseCase(
  deps: {
    metricsRepository: {
      getRangeSummary(range: { dateFrom: string; dateTo: string }): Promise<{
        plannedMinutes: number;
        actualMinutes: number;
        completedMinutes: number;
        atRiskTaskCount: number;
        pendingProposalCount: number;
      }>;
    };
  },
  range: { dateFrom: string; dateTo: string },
) {
  return deps.metricsRepository.getRangeSummary(range);
}

import type { SchedulerStateRepository } from "../ports";

export async function listSchedulerLogsUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "listRuns">;
  },
  input?: {
    cursor?: string;
    limit?: number;
  },
) {
  const runs = await deps.schedulerStateRepository.listRuns({
    cursor: input?.cursor,
    limit: input?.limit ?? 20,
  });

  return { runs };
}

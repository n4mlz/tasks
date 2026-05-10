import type { SchedulerStateRepository } from "../ports";

export async function listSchedulerLogsUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "listMutations" | "listRuns">;
  },
  input?: {
    mutationLimit?: number;
    runLimit?: number;
  },
) {
  const [mutations, runs] = await Promise.all([
    deps.schedulerStateRepository.listMutations(input?.mutationLimit ?? 50),
    deps.schedulerStateRepository.listRuns(input?.runLimit ?? 30),
  ]);

  return {
    mutations,
    runs,
  };
}

import type { Clock, SchedulerStateRepository } from "../ports";

export async function getSchedulerStatusUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "getState" | "listRuns">;
    clock: Clock;
  },
) {
  const state = await deps.schedulerStateRepository.getState();
  const latestRun = (await deps.schedulerStateRepository.listRuns({ limit: 1 }))[0];
  const hasPendingChanges =
    state.currentRevision > state.lastScheduledRevision ||
    state.schedulerStatus === "failed";
  const nextRunAt =
    hasPendingChanges && state.lastMutationAt && state.schedulerStatus !== "failed"
      ? new Date(new Date(state.lastMutationAt).getTime() + 3 * 60_000).toISOString()
      : null;
  const secondsUntilNextRun =
    nextRunAt && state.schedulerStatus !== "running"
      ? Math.max(0, Math.ceil((new Date(nextRunAt).getTime() - new Date(deps.clock.now()).getTime()) / 1000))
      : null;

  return {
    ...state,
    latestRunAt: latestRun?.startedAt ?? null,
    hasPendingChanges,
    nextRunAt,
    secondsUntilNextRun,
  };
}

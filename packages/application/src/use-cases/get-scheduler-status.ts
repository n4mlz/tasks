import type { Clock, SchedulerStateRepository } from "../ports";

export async function getSchedulerStatusUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "getState">;
    clock: Clock;
  },
) {
  const state = await deps.schedulerStateRepository.getState();
  const hasPendingChanges = state.currentRevision > state.lastScheduledRevision;
  const nextRunAt =
    hasPendingChanges && state.lastMutationAt
      ? new Date(new Date(state.lastMutationAt).getTime() + 3 * 60_000).toISOString()
      : null;
  const secondsUntilNextRun =
    nextRunAt && state.schedulerStatus !== "running"
      ? Math.max(0, Math.ceil((new Date(nextRunAt).getTime() - new Date(deps.clock.now()).getTime()) / 1000))
      : null;

  return {
    ...state,
    hasPendingChanges,
    nextRunAt,
    secondsUntilNextRun,
  };
}

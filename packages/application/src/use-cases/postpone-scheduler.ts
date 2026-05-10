import type { Clock, SchedulerStateRepository } from "../ports";

export async function postponeSchedulerUseCase(
  deps: {
    schedulerStateRepository: Pick<SchedulerStateRepository, "postponeNextRun">;
    clock: Clock;
  },
  input: {
    delayMilliseconds: number;
    debounceMilliseconds?: number;
  },
) {
  await deps.schedulerStateRepository.postponeNextRun({
    now: deps.clock.now(),
    delayMilliseconds: input.delayMilliseconds,
    debounceMilliseconds: input.debounceMilliseconds ?? 3 * 60_000,
  });
}

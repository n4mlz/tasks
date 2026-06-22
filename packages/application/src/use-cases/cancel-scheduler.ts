import type { SchedulerStateRepository } from "../ports";

export async function cancelSchedulerUseCase(deps: {
  schedulerStateRepository: Pick<SchedulerStateRepository, "cancelRun">;
}): Promise<void> {
  await deps.schedulerStateRepository.cancelRun();
}

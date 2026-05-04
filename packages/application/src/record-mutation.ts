import type { Clock, IdGenerator, SchedulerStateRepository } from "./ports";

export async function recordPlanningMutation(deps: {
  schedulerStateRepository: Pick<SchedulerStateRepository, "recordMutation">;
  clock: Clock;
  idGenerator: IdGenerator;
  mutationKind: string;
  entityType: string;
  entityId?: string | null;
  details: Record<string, unknown>;
}) {
  return deps.schedulerStateRepository.recordMutation({
    mutationId: deps.idGenerator.next("mutation"),
    mutationKind: deps.mutationKind,
    entityType: deps.entityType,
    entityId: deps.entityId ?? null,
    createdAt: deps.clock.now(),
    details: deps.details,
  });
}

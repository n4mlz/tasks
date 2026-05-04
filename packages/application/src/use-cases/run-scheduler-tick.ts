import { buildSchedulePlan, validateSchedulePlan } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  PlanningIntelligence,
  ScheduleRepository,
  SchedulerStateRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

function dedupePriorityOrder(input: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of input) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}

export async function runSchedulerTickUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "listSchedulable" | "save">;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "saveCurrentSchedule">;
    schedulerStateRepository: Pick<
      SchedulerStateRepository,
      "tryStartRun" | "completeRun" | "insertRun" | "listMutations" | "getState"
    >;
    planningIntelligence: PlanningIntelligence;
    clock: Clock;
    idGenerator: IdGenerator;
  },
) {
  const now = deps.clock.now();
  const claim = await deps.schedulerStateRepository.tryStartRun({
    now,
    debounceMilliseconds: 3 * 60_000,
  });

  if (!claim.started) {
    return {
      ran: false,
      reason: "not_due",
      state: claim.state,
    };
  }

  const runId = deps.idGenerator.next("schedule_run");
  const recentMutations = (await deps.schedulerStateRepository.listMutations(20)).map((item) => ({
    mutationKind: item.mutationKind,
    entityType: item.entityType,
    entityId: item.entityId,
    createdAt: item.createdAt,
  }));

  try {
    const tasks = await deps.taskRepository.listSchedulable();
    const horizon = selectScheduleHorizon({
      today: deps.clock.today(),
      tasks,
    });
    const capacities = expandCapacityWindow({
      dateFrom: horizon.start,
      dateTo: horizon.end,
      capacities: await deps.capacityRepository.listBetween(horizon.start, horizon.end),
    });

    const analysis = await deps.planningIntelligence.analyzeSchedule({
      today: deps.clock.today(),
      tasks,
      capacities,
      recentMutations,
    });

    const annotationByTaskId = new Map(analysis.annotations.map((annotation) => [annotation.taskId, annotation]));
    const annotatedTasks = tasks.map((task) => {
      const annotation = annotationByTaskId.get(task.id);
      if (!annotation) return task;

      return {
        ...task,
        taskType: annotation.taskType,
        cognitiveLoad: annotation.cognitiveLoad,
        energy: annotation.energy,
        tags: annotation.tags,
        updatedAt: deps.clock.now(),
      };
    });

    for (const task of annotatedTasks) {
      await deps.taskRepository.save(task);
    }

    const plan = buildSchedulePlan({
      today: deps.clock.today(),
      tasks: annotatedTasks,
      capacities,
      priorityOrder: dedupePriorityOrder(analysis.priorityOrder),
    });
    const validation = validateSchedulePlan({
      plan,
      tasks: annotatedTasks,
      capacities,
    });

    if (!validation.isValid) {
      await deps.schedulerStateRepository.insertRun({
        id: runId,
        targetRevision: claim.targetRevision,
        status: "failed",
        reason: "validation_failed",
        startedAt: now,
        finishedAt: deps.clock.now(),
        rationale: analysis.rationale,
        validation: {
          isValid: false,
          errors: validation.errors,
        },
        errorMessage: "schedule validation failed",
      });
      await deps.schedulerStateRepository.completeRun({
        targetRevision: claim.targetRevision,
        finishedAt: deps.clock.now(),
        status: "failed",
        scheduled: false,
      });

      return {
        ran: true,
        scheduled: false,
        status: "failed",
        validation,
      };
    }

    const latestState = await deps.schedulerStateRepository.getState();
    if (latestState.currentRevision !== claim.targetRevision) {
      await deps.schedulerStateRepository.insertRun({
        id: runId,
        targetRevision: claim.targetRevision,
        status: "superseded",
        reason: "newer_mutation_arrived",
        startedAt: now,
        finishedAt: deps.clock.now(),
        rationale: analysis.rationale,
        validation: {
          isValid: true,
          errors: [],
        },
        errorMessage: "",
      });
      await deps.schedulerStateRepository.completeRun({
        targetRevision: claim.targetRevision,
        finishedAt: deps.clock.now(),
        status: "pending",
        scheduled: false,
      });

      return {
        ran: true,
        scheduled: false,
        status: "superseded",
        validation,
      };
    }

    await deps.scheduleRepository.saveCurrentSchedule({
      ...plan,
      id: deps.idGenerator.next("schedule"),
      reason: "polling_tick",
      generatedAt: deps.clock.now(),
    });

    await deps.schedulerStateRepository.insertRun({
      id: runId,
      targetRevision: claim.targetRevision,
      status: "scheduled",
      reason: "polling_tick",
      startedAt: now,
      finishedAt: deps.clock.now(),
      rationale: analysis.rationale,
      validation: {
        isValid: true,
        errors: [],
      },
      errorMessage: "",
    });
    await deps.schedulerStateRepository.completeRun({
      targetRevision: claim.targetRevision,
      finishedAt: deps.clock.now(),
      status: "idle",
      scheduled: true,
    });

    return {
      ran: true,
      scheduled: true,
      status: "scheduled",
      validation,
    };
  } catch (error) {
    await deps.schedulerStateRepository.insertRun({
      id: runId,
      targetRevision: claim.targetRevision,
      status: "failed",
      reason: "exception",
      startedAt: now,
      finishedAt: deps.clock.now(),
      rationale: "",
      validation: {},
      errorMessage: error instanceof Error ? error.message : "unknown error",
    });
    await deps.schedulerStateRepository.completeRun({
      targetRevision: claim.targetRevision,
      finishedAt: deps.clock.now(),
      status: "failed",
      scheduled: false,
    });
    throw error;
  }
}

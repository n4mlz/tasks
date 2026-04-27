import { buildScheduleProposal, createTask } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function createTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "save">;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    title: string;
    remainingMinutes: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    taskType?: "deep" | "shallow" | "admin" | "research" | "writing" | "implementation" | "unknown";
    energy?: "low" | "medium" | "high" | "unknown";
    notes?: string;
  },
): Promise<void> {
  const createdAt = deps.clock.now();
  const task = createTask({
    id: deps.idGenerator.next("task"),
    title: input.title,
    remainingMinutes: input.remainingMinutes,
    dueDate: input.dueDate,
    urgency: input.urgency,
    taskType: input.taskType,
    energy: input.energy,
    notes: input.notes,
    createdAt,
  });

  await deps.taskRepository.save(task);

  const horizon = selectScheduleHorizon({
    today: deps.clock.today(),
    tasks: [task],
  });
  const capacities = expandCapacityWindow({
    dateFrom: horizon.start,
    dateTo: horizon.end,
    capacities: await deps.capacityRepository.listBetween(horizon.start, horizon.end),
  });

  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks: [task],
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "task_created",
    generatedAt: createdAt,
  });
}

import { buildScheduleProposal, updateTaskEstimate } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
  WorkLogRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function logWorkUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "save" | "listSchedulable">;
    workLogRepository: WorkLogRepository;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    taskId: string;
    date: string;
    spentMinutes: number;
    remainingMinutesAfter: number;
    note?: string;
  },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const updatedTask = updateTaskEstimate(task, {
    remainingMinutes: input.remainingMinutesAfter,
    updatedAt: deps.clock.now(),
  });

  await deps.workLogRepository.append({
    id: deps.idGenerator.next("worklog"),
    taskId: input.taskId,
    date: input.date,
    spentMinutes: input.spentMinutes,
    remainingMinutesAfter: input.remainingMinutesAfter,
    note: input.note ?? "",
  });

  await deps.taskRepository.save(updatedTask);

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
  const proposal = buildScheduleProposal({
    today: deps.clock.today(),
    tasks,
    capacities,
  });

  await deps.scheduleRepository.savePendingProposal({
    ...proposal,
    id: deps.idGenerator.next("proposal"),
    reason: "work_logged",
    generatedAt: deps.clock.now(),
  });
}

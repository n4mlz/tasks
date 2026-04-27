import { buildScheduleProposal } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";
import { expandCapacityWindow, selectScheduleHorizon } from "../schedule-window";

export async function updateTaskUseCase(
  deps: {
    taskRepository: Pick<TaskRepository, "findById" | "save" | "listSchedulable">;
    capacityRepository: Pick<CapacityRepository, "listBetween">;
    scheduleRepository: Pick<ScheduleRepository, "savePendingProposal">;
    clock: Clock;
    idGenerator: IdGenerator;
  },
  input: {
    taskId: string;
    title?: string;
    remainingMinutes?: number;
    dueDate?: string | null;
    urgency?: "today" | "soon" | "normal";
    taskType?: "deep" | "shallow" | "admin" | "research" | "writing" | "implementation" | "unknown";
    energy?: "low" | "medium" | "high" | "unknown";
    status?: "inbox" | "active" | "done" | "archived";
    notes?: string;
  },
): Promise<void> {
  const task = await deps.taskRepository.findById(input.taskId);
  if (!task) {
    throw new Error(`Task not found: ${input.taskId}`);
  }

  const updatedTask = {
    ...task,
    title: input.title ?? task.title,
    remainingMinutes: input.remainingMinutes ?? task.remainingMinutes,
    dueDate: input.dueDate === undefined ? task.dueDate : input.dueDate,
    urgency: input.urgency ?? task.urgency,
    taskType: input.taskType ?? task.taskType,
    energy: input.energy ?? task.energy,
    status: input.status ?? task.status,
    notes: input.notes ?? task.notes,
    updatedAt: deps.clock.now(),
  };

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
    reason: "task_updated",
    generatedAt: deps.clock.now(),
  });
}

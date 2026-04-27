import { buildScheduleProposal } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";

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
    status: input.status ?? task.status,
    notes: input.notes ?? task.notes,
    updatedAt: deps.clock.now(),
  };

  await deps.taskRepository.save(updatedTask);

  const tasks = await deps.taskRepository.listSchedulable();
  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    deps.clock.today(),
  );
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

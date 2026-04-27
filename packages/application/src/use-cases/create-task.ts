import { buildScheduleProposal, createTask } from "@task-platform/domain";
import type {
  CapacityRepository,
  Clock,
  IdGenerator,
  ScheduleRepository,
  TaskRepository,
} from "../ports";

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
    notes: input.notes,
    createdAt,
  });

  await deps.taskRepository.save(task);

  const capacities = await deps.capacityRepository.listBetween(
    deps.clock.today(),
    deps.clock.today(),
  );

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

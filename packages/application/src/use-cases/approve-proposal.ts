import type { Clock, ScheduleRepository } from "../ports";

export async function approveProposalUseCase(
  deps: {
    scheduleRepository: Pick<ScheduleRepository, "approveProposal">;
    clock: Clock;
  },
  input: { proposalId: string },
): Promise<void> {
  await deps.scheduleRepository.approveProposal(input.proposalId, deps.clock.now());
}

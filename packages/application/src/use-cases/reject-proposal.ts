import type { ScheduleRepository } from "../ports";

export async function rejectProposalUseCase(
  deps: {
    scheduleRepository: Pick<ScheduleRepository, "rejectProposal">;
  },
  input: { proposalId: string },
): Promise<void> {
  await deps.scheduleRepository.rejectProposal(input.proposalId);
}

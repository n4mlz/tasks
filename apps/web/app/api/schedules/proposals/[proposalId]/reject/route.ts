import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../../../lib/task-platform";

export async function POST(
  _request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const params = await context.params;
  await taskPlatform.rejectProposal({ proposalId: params.proposalId });
  return NextResponse.json({ ok: true }, { status: 200 });
}

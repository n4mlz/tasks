import { NextResponse } from "next/server";
import { taskPlatform } from "../../../../../../lib/task-platform";

export async function POST(
  request: Request,
  context: { params: Promise<{ proposalId: string }> },
) {
  const params = await context.params;
  await taskPlatform.approveProposal({ proposalId: params.proposalId });
  if (!(request.headers.get("content-type") ?? "").includes("application/json")) {
    return NextResponse.redirect(new URL("/proposals", request.url), { status: 303 });
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}

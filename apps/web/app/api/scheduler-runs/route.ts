import { NextResponse } from "next/server";
import { taskPlatform } from "../../../lib/task-platform";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);

  const { runs } = (await taskPlatform.listSchedulerLogs({ cursor, limit })) as {
    runs: Array<{
      id: string;
      targetRevision: number;
      status: string;
      reason: string;
      startedAt: string;
      finishedAt: string | null;
      rationale: string;
      validation: Record<string, unknown>;
      errorMessage: string;
    }>;
  };

  const nextCursor = runs.length === limit ? runs.at(-1)?.startedAt ?? null : null;

  return NextResponse.json({ runs, nextCursor });
}

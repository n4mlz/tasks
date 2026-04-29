import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { StatusBadge } from "../../components/status-badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { taskPlatform } from "../../lib/task-platform";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const proposals = (await taskPlatform.listProposals("pending")) as Array<{
    id: string;
    reason: string;
    summary?: {
      riskFlags?: string[];
      unscheduledTaskIds?: string[];
      capacityPressureByDate?: Record<string, number>;
    };
  }>;

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">提案</h1>
        <StatusBadge tone="secondary">{`${proposals.length} 件`}</StatusBadge>
      </div>

      {proposals.length === 0 ? (
        <Card className="border-dashed border-slate-300/90 bg-white/90">
          <CardContent className="p-5 text-sm text-slate-600">承認待ちの提案はありません。</CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {proposals.map((proposal) => {
            const riskFlags = proposal.summary?.riskFlags ?? [];
            const unscheduledTaskIds = proposal.summary?.unscheduledTaskIds ?? [];
            const capacityPressureEntries = Object.entries(
              proposal.summary?.capacityPressureByDate ?? {},
            );

            return (
              <Card key={proposal.id} className="border-white/80 bg-white/94">
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg tracking-[-0.03em]">{proposal.id}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone="secondary">{proposal.reason}</StatusBadge>
                        {riskFlags.length > 0 ? (
                          <StatusBadge tone="warning">{`${riskFlags.length} 件の注意`}</StatusBadge>
                        ) : null}
                        {unscheduledTaskIds.length > 0 ? (
                          <StatusBadge tone="danger">{`未配分 ${unscheduledTaskIds.length}`}</StatusBadge>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <form action={`/api/schedules/proposals/${proposal.id}/approve`} method="post">
                        <Button type="submit">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          承認
                        </Button>
                      </form>
                      <form action={`/api/schedules/proposals/${proposal.id}/reject`} method="post">
                        <Button type="submit" variant="outline">
                          <XCircle className="mr-2 h-4 w-4" />
                          却下
                        </Button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 text-sm text-slate-600">
                  {riskFlags.length > 0 ? (
                    <div className="grid gap-1">
                      <span className="font-medium text-slate-900">リスク</span>
                      <ul className="grid gap-1">
                        {riskFlags.map((flag) => (
                          <li key={flag}>{flag}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {unscheduledTaskIds.length > 0 ? (
                    <div className="grid gap-1">
                      <span className="font-medium text-slate-900">未配分 task</span>
                      <div className="flex flex-wrap gap-2">
                        {unscheduledTaskIds.map((taskId) => (
                          <StatusBadge key={taskId} tone="danger">
                            {taskId}
                          </StatusBadge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {capacityPressureEntries.length > 0 ? (
                    <div className="grid gap-1">
                      <span className="font-medium text-slate-900">容量圧迫</span>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>日付</TableHead>
                            <TableHead>圧迫率</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {capacityPressureEntries.map(([date, pressure]) => (
                            <TableRow key={date}>
                              <TableCell>{date}</TableCell>
                              <TableCell>{pressure}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

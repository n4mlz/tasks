import React from "react";
import { CheckCircle2, GitCompareArrows, ShieldAlert, XCircle } from "lucide-react";
import { SectionHeader } from "../../components/section-header";
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
    <section className="grid gap-6">
      <Card className="border-white/70 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.08)]">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <SectionHeader
            eyebrow="提案"
            title="再配分の提案を確認する"
            description="task・実績・余力時間の変更によって作られた保留中の提案をここで承認します。agent は作成できても、確定は人間が行います。"
          />
          <div className="grid gap-3 rounded-[24px] border border-slate-200/80 bg-slate-50/80 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <GitCompareArrows className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold">見るべき観点</span>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              締切リスク、未配分 task、容量が苦しい日付だけ見れば十分です。細かい順序の最適化は後からでもできます。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <SectionHeader
          compact
          title="承認待ちの提案"
          description="各 proposal の理由と危険信号を密度高く確認できる review 面です。"
        />

        {proposals.length === 0 ? (
          <Card className="border-dashed border-slate-300/90 bg-white/90">
            <CardContent className="p-6 text-sm leading-6 text-slate-600">
              現在 pending の proposal はありません。task や余力時間が変わると、新しい proposal がここに並びます。
            </CardContent>
          </Card>
        ) : (
          proposals.map((proposal) => {
            const riskFlags = proposal.summary?.riskFlags ?? [];
            const unscheduledTaskIds = proposal.summary?.unscheduledTaskIds ?? [];
            const capacityPressureEntries = Object.entries(
              proposal.summary?.capacityPressureByDate ?? {},
            );

            return (
              <Card
                key={proposal.id}
                className="border-white/80 bg-white/94 shadow-[0_14px_44px_rgba(15,23,42,0.07)]"
              >
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle className="text-lg tracking-[-0.03em]">{proposal.id}</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone="secondary">{proposal.reason}</StatusBadge>
                        <StatusBadge tone={riskFlags.length > 0 ? "warning" : "success"}>
                          {riskFlags.length > 0 ? `${riskFlags.length} 件の注意` : "大きな警告なし"}
                        </StatusBadge>
                        <StatusBadge tone={unscheduledTaskIds.length > 0 ? "danger" : "outline"}>
                          未配分 {unscheduledTaskIds.length}
                        </StatusBadge>
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
                <CardContent className="grid gap-5">
                  <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.2fr]">
                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="mb-3 flex items-center gap-2 text-slate-900">
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold">リスク</span>
                      </div>
                      {riskFlags.length === 0 ? (
                        <p className="text-sm leading-6 text-slate-600">リスクは検出されていません。</p>
                      ) : (
                        <ul className="grid gap-2 text-sm leading-6 text-slate-600">
                          {riskFlags.map((flag) => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="mb-3 flex items-center gap-2 text-slate-900">
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                        <span className="text-sm font-semibold">未配分 task</span>
                      </div>
                      <h3 className="sr-only">未配分 task</h3>
                      {unscheduledTaskIds.length === 0 ? (
                        <p className="text-sm leading-6 text-slate-600">すべての task が配分済みです。</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {unscheduledTaskIds.map((taskId) => (
                            <StatusBadge key={taskId} tone="danger">
                              {taskId}
                            </StatusBadge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4">
                      <div className="mb-3 flex items-center gap-2 text-slate-900">
                        <GitCompareArrows className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-semibold">容量圧迫</span>
                      </div>
                      <h3 className="sr-only">容量圧迫</h3>
                      {capacityPressureEntries.length === 0 ? (
                        <p className="text-sm leading-6 text-slate-600">圧迫した日付はありません。</p>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </section>
  );
}

import React from "react";
import { DashboardTabs } from "../../components/dashboard-tabs";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">ダッシュボード</h1>
      </div>
      <DashboardTabs />
    </section>
  );
}

export const urgencyLabels: Record<string, string> = {
  today: "今日",
  soon: "近日",
  normal: "通常",
};

export const taskTypeLabels: Record<string, string> = {
  deep: "深い作業",
  shallow: "軽作業",
  admin: "事務",
  research: "調査",
  writing: "執筆",
  implementation: "実装",
  unknown: "未分類",
};

export const energyLabels: Record<string, string> = {
  low: "低め",
  medium: "中くらい",
  high: "高め",
  unknown: "未設定",
};

export const statusLabels: Record<string, string> = {
  inbox: "inbox",
  active: "進行中",
  done: "完了",
  archived: "保管",
};

function normalizeHoursString(value: string): string {
  if (!value.includes(".")) {
    return `${value}.0`;
  }

  const trimmed = value.replace(/0+$/, "").replace(/\.$/, "");
  return trimmed.includes(".") ? trimmed : `${trimmed}.0`;
}

export function formatHoursFromMinutes(minutes: number): string {
  const hours = minutes / 60;
  return `${normalizeHoursString(hours.toFixed(2))} 時間`;
}

export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

export function formatCompletionRate(spentMinutes: number, totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return "0%";
  }

  return `${Math.round((spentMinutes / totalMinutes) * 100)}%`;
}

export function formatIsoDate(date: string): string {
  return date;
}

export function humanizeProposalReason(reason: string): string {
  const labels: Record<string, string> = {
    task_created: "task 追加を受けて再配分しました",
    task_updated: "task 更新を受けて再配分しました",
    work_logged: "作業記録を受けて再配分しました",
    capacity_updated: "余力時間の変更を受けて再配分しました",
    manual: "手動で再配分しました",
  };

  return labels[reason] ?? "再配分しました";
}

export function humanizeRiskFlag(
  flag: string,
  taskTitleById: Map<string, string>,
): string {
  const [taskId, code] = flag.split(":");
  const taskTitle = taskTitleById.get(taskId) ?? taskId;

  if (code === "insufficient_capacity_before_due_date") {
    return `${taskTitle}: 期限までに収まりきらない可能性があります`;
  }

  return `${taskTitle}: 注意が必要です`;
}

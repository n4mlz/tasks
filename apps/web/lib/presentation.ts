export const urgencyLabels: Record<string, string> = {
  today: "今日",
  soon: "近日",
  normal: "通常",
};

export const taskTypeLabels: Record<string, string> = {
  implementation: "実装",
  writing: "執筆",
  research: "調査",
  communication: "連絡",
  memorization: "暗記",
  admin: "事務",
  design: "設計",
  other: "その他",
  unknown: "未分類",
};

export const cognitiveLoadLabels: Record<string, string> = {
  low: "頭の負荷 低",
  medium: "頭の負荷 中",
  high: "頭の負荷 高",
  unknown: "頭の負荷 未設定",
};

export const energyLabels: Record<string, string> = {
  low: "体力 低",
  medium: "体力 中",
  high: "体力 高",
  unknown: "体力 未設定",
};

export const schedulerMutationLabels: Record<string, string> = {
  task_created: "タスクを追加",
  task_updated: "タスクを更新",
  task_deleted: "タスクを削除",
  work_logged: "作業記録を追加",
  capacity_updated: "余力時間を更新",
};

export const schedulerRunStatusLabels: Record<string, string> = {
  scheduled: "再配分完了",
  superseded: "変更が入り再実行待ち",
  failed: "再配分失敗",
  idle: "待機中",
  pending: "再配分待ち",
  running: "再配分中",
};

export const schedulerRunReasonLabels: Record<string, string> = {
  polling_tick: "定期実行で再配分しました",
  newer_mutation_arrived: "実行中に新しい変更が入りました",
  validation_failed: "再配分結果が検証に失敗しました",
  insufficient_capacity_window: "余力時間が足りないため再配分できませんでした",
  exception: "再配分中に例外が発生しました",
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

export function formatJapaneseDate(value: string | null, withWeekday = false): string {
  if (!value) return "-";
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  const parts = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    ...(withWeekday ? { weekday: "short" as const } : {}),
    timeZone: "UTC",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const label = `${part("month")}月${part("day")}日`;
  return withWeekday ? `${label}（${part("weekday")}）` : label;
}

export function formatDateTimeShort(value: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Tokyo",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")}月${part("day")}日 ${part("hour")}:${part("minute")}`;
}

export function formatDateTimeLong(value: string | null): string {
  return formatDateTimeShort(value);
}

export function formatEtaMinutes(seconds: number | null): string {
  if (seconds === null) return "-";
  const minutes = Math.max(0, Math.ceil(seconds / 60));
  return minutes <= 1 ? "1分以内" : `${minutes}分後`;
}

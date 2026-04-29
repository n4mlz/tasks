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

export function formatMinutes(minutes: number): string {
  return `${minutes} 分`;
}

export function formatIsoDate(date: string): string {
  return date;
}

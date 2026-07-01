import type { IconName } from "@/components/brainx-ui";

export type TokenUsageRow = {
  label: string;
  value: number;
  percent: number;
  icon: IconName;
};

export type TokenUsageSummary = {
  used: number;
  limit: number;
  percent: number;
  breakdown: TokenUsageRow[];
};

export const TOKEN_USAGE_SUMMARY: TokenUsageSummary = {
  used: 287400,
  limit: 1000000,
  percent: 28.7,
  breakdown: [
    { label: "AI 글쓰기 도우미", value: 142800, percent: 50, icon: "rewrite" },
    { label: "자동 요약", value: 68200, percent: 24, icon: "doc" },
    { label: "시맨틱 검색", value: 44900, percent: 16, icon: "search" },
    { label: "자동 태그 정리", value: 31500, percent: 11, icon: "sparkle" }
  ]
};

export function formatTokenCount(value: number) {
  return value.toLocaleString("ko-KR");
}

export function formatTokenPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

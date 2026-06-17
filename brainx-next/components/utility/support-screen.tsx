"use client";

import { useEffect, useMemo, useState } from "react";

import { useBrainX } from "@/components/brainx-provider";
import { Badge, Btn, EmptyState, Icon } from "@/components/brainx-ui";
import { SectionCard } from "@/components/utility/utility-shared";
import { createSupportInquiry, getMySupportInquiries, type SupportInquiry } from "@/lib/support-api";
import { cx } from "@/lib/utils";

const CATEGORIES = ["기능 문의", "버그 신고", "결제/환불", "계정", "기타"] as const;

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  RECEIVED: { label: "접수", color: "99 102 241" },
  IN_PROGRESS: { label: "처리 중", color: "234 179 8" },
  ANSWERED: { label: "답변 완료", color: "34 197 94" },
  CLOSED: { label: "종료", color: "148 163 184" }
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function SupportScreen() {
  const { pushToast } = useBrainX();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("기능 문의");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [inquiries, setInquiries] = useState<SupportInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return inquiries;
    return inquiries.filter((item) => `${item.category} ${item.title} ${item.content}`.toLowerCase().includes(keyword));
  }, [inquiries, query]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getMySupportInquiries()
      .then((data) => {
        if (active) setInquiries(data);
      })
      .catch((error) => pushToast(error instanceof Error ? error.message : "문의 내역을 불러오지 못했습니다.", "err"))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pushToast]);

  const submitInquiry = async () => {
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) {
      pushToast("제목과 내용을 입력해 주세요.", "err");
      return;
    }

    setSubmitting(true);
    try {
      const created = await createSupportInquiry({ category, title: nextTitle, content: nextContent });
      setInquiries((current) => [created, ...current]);
      setTitle("");
      setContent("");
      pushToast("문의가 접수되었습니다.", "ok");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "문의 접수에 실패했습니다.", "err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-route className="mx-auto max-w-[1180px] px-6 py-7 md:px-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge color="99 102 241" dot className="mb-2.5">
            고객 지원
          </Badge>
          <h1 className="text-[27px] font-bold tracking-tight text-txt">문의하기</h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-txt2">문의 작성과 처리 상태를 한 곳에서 확인하세요.</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="문의 작성" sub="접수된 문의는 내 문의 내역에 바로 반영됩니다.">
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-[12px] font-medium text-txt2">문의 유형</div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cx(
                      "h-9 rounded-full border px-4 text-[13px] font-medium transition-colors",
                      category === item ? "border-primary bg-primary text-white" : "border-line/60 bg-surface2/40 text-txt2 hover:text-txt"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <div className="mb-1.5 text-[12px] font-medium text-txt2">제목</div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                placeholder="문의 제목을 입력하세요"
                className="h-11 w-full rounded-xl border border-line/60 bg-surface2/50 px-3.5 text-[14px] text-txt outline-none focus:border-primary/60"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 text-[12px] font-medium text-txt2">내용</div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={9}
                maxLength={10000}
                placeholder="문제가 발생한 상황이나 요청 내용을 자세히 적어 주세요."
                className="w-full resize-none rounded-xl border border-line/60 bg-surface2/50 px-3.5 py-3 text-[14px] text-txt outline-none focus:border-primary/60"
              />
            </label>

            <Btn variant="primary" icon="send" className="w-full" disabled={submitting} onClick={submitInquiry}>
              {submitting ? "접수 중" : "문의 접수"}
            </Btn>
          </div>
        </SectionCard>

        <SectionCard
          title="내 문의 내역"
          sub="최근 접수된 문의부터 표시됩니다."
          action={
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt3" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="검색"
                className="h-9 w-44 rounded-xl border border-line/60 bg-surface2/40 pl-9 pr-3 text-[13px] text-txt outline-none focus:border-primary/60"
              />
            </div>
          }
        >
          {loading ? (
            <div className="grid min-h-[320px] place-items-center text-[13px] text-txt3">문의 내역을 불러오는 중입니다.</div>
          ) : filtered.length ? (
            <div className="space-y-3">
              {filtered.map((item) => {
                const status = STATUS_LABEL[item.status] ?? STATUS_LABEL.RECEIVED;
                return (
                  <article key={item.inquiryId} className="rounded-xl border border-line/60 bg-surface2/35 p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <Badge>{item.category}</Badge>
                          <span className="text-[11.5px] text-txt3">{formatDate(item.createdAt)}</span>
                        </div>
                        <h2 className="truncate text-[15px] font-semibold text-txt">{item.title}</h2>
                      </div>
                      <Badge color={status.color} dot>{status.label}</Badge>
                    </div>
                    <p className="line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-txt2">{item.content}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState icon="chat" title="문의 내역이 없습니다" desc="궁금한 점이나 문제가 생기면 문의를 남겨 주세요." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

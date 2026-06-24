"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { getAssetFileUrl } from "@/lib/ingestion-api";

interface Props {
  assetId: string;
  fileName: string;
}

/** Tiptap 노트 에디터를 전혀 띄우지 않는, PDF 전용 화면. 파일 가져오기로 만들어진 노트의
    본문이 PDF 임베드 블록 하나뿐이면(parsePdfOnlyNote) EditorPanel이 NoteEditor 대신
    이 컴포넌트를 패널 전체 높이로 렌더링한다. */
export default function PdfViewerPanel({ assetId, fileName }: Props) {
  const url = getAssetFileUrl(assetId);
  const frameRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === frameRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement === frameRef.current) {
      void document.exitFullscreen();
    } else {
      void frameRef.current?.requestFullscreen();
    }
  };

  return (
    <div ref={frameRef} className="flex h-full flex-1 flex-col bg-surface">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line/40 bg-surface2/40 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={15} className="shrink-0 text-txt3" />
          <span className="min-w-0 truncate text-[13px] font-medium text-txt2">{fileName}</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {!isFullscreen && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[12px] text-txt3 hover:text-txt"
            >
              새 탭에서 열기
              <ExternalLink size={12} />
            </a>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-1 text-[12px] text-txt3 hover:text-txt"
          >
            {isFullscreen ? "전체화면 종료" : "큰 화면으로 보기"}
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>
      <iframe src={url} title={fileName} className={cx("w-full flex-1 bg-surface")} />
    </div>
  );
}

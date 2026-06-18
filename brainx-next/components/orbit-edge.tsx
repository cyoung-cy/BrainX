import { BaseEdge, EdgeProps, getStraightPath } from '@xyflow/react';

export function OrbitEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  data,
}: EdgeProps) {
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const isBridge = data?.isBridge as boolean | undefined;
  const isBridgeHighlight = data?.isBridgeHighlight as boolean | undefined;
  const isSelected = data?.isSelected as boolean | undefined;
  const isDimmed = data?.isDimmed as boolean | undefined;
  const theme = data?.theme as '2d' | 'universe' | undefined;
  const is2D = theme === '2d';

  const strokeColor = isBridge ? "rgb(var(--primary) / 0.35)" : "rgb(var(--border) / 0.6)";
  const selectedStroke = "rgb(var(--primary))"; // primary accent color
  
  const uniStrokeColor = isBridge ? "rgb(34 211 238 / 0.35)" : "rgb(148 163 184 / 0.18)";
  const uniSelectedStroke = "rgb(165 126 255 / 0.8)";

  // 징검다리 강조 모드: 우주모드 선택과 동일한 스타일 (blur 없음)
  const bridgeHighlightColor = "rgb(165 126 255)"; // uniSelectedStroke와 동일한 보라색

  const strokeW = isSelected ? 2 : (isBridge ? 1.6 : 1);
  const color = isSelected ? (is2D ? selectedStroke : uniSelectedStroke) : (is2D ? strokeColor : uniStrokeColor);

  // 강조 모드일 때 덮어씀
  const finalColor = isBridgeHighlight ? bridgeHighlightColor : color;
  const finalStrokeW = isBridgeHighlight ? 2 : strokeW;
  const finalDash = isBridgeHighlight ? '4 4' : (isBridge || isSelected ? '4 4' : 'none');
  const finalFilter = isBridgeHighlight
    ? 'none'
    : (isSelected && !is2D ? `drop-shadow(0 0 8px ${color})` : 'none');
  const finalOpacity = isDimmed
    ? (isBridgeHighlight ? 0.4 : (is2D ? 0.15 : 0.2))
    : 1;

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        style={{
          ...style,
          stroke: finalColor,
          strokeWidth: finalStrokeW,
          strokeDasharray: finalDash,
          transition: "stroke 0.15s, stroke-width 0.15s, opacity 0.15s",
          opacity: finalOpacity,
          filter: finalFilter,
        }} 
      />
      {/* 우주모드 선택 시 흰 점 애니메이션 */}
      {isSelected && !is2D && (
        <circle r="2.5" fill="#fff" style={{ filter: `drop-shadow(0 0 4px #fff)` }}>
          <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
      {/* 징검다리 강조 시 흰 점 애니메이션 (우주모드 선택과 동일) */}
      {isBridgeHighlight && (
        <circle r="2.5" fill="#fff">
          <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
}

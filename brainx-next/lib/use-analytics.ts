import { useEffect } from 'react';
import { useGuideStore } from './use-guide-store';

export const useAnalytics = () => {
  const incrementEventCount = useGuideStore((s) => s.incrementEventCount);
  const discoverFeature = useGuideStore((s) => s.discoverFeature);
  const updateSkillLevel = useGuideStore((s) => s.updateSkillLevel);
  const { discoveredFeatures, skillLevel, firstSeenAt } = useGuideStore();

  const track = (eventName: string, properties?: Record<string, any>) => {
    // 1. 실제 분석 툴 연동 (PostHog/Mixpanel 등). 현재는 console 로깅으로 대체.
    console.log(`[Analytics] Track: ${eventName}`, properties);

    // 2. 내부 상태 업데이트
    incrementEventCount();
    
    // 주요 기능 발견 로직
    if (eventName.includes('mindmap')) discoverFeature('mindmap');
    if (eventName.includes('search')) discoverFeature('search');
    if (eventName.includes('ai')) discoverFeature('ai_question');
    if (eventName.includes('note')) discoverFeature('note_create');
    
    // 3. 사용자 숙련도 재평가
    evaluateSkillLevel();
  };

  const evaluateSkillLevel = () => {
    const daysSinceFirstSeen = (Date.now() - new Date(firstSeenAt).getTime()) / (1000 * 60 * 60 * 24);
    let newLevel = skillLevel;
    
    // 핵심 기능 종류: mindmap, search, ai_question, note_create
    if (discoveredFeatures.length >= 3) {
      newLevel = 'ADVANCED';
    } else if (discoveredFeatures.length >= 2 || daysSinceFirstSeen > 7) {
      newLevel = 'INTERMEDIATE';
    } else {
      newLevel = 'BEGINNER';
    }

    if (newLevel !== skillLevel) {
      updateSkillLevel(newLevel);
      console.log(`[Analytics] Skill level updated to ${newLevel}`);
    }
  };

  return { track };
};

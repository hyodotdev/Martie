import type {CSSProperties} from 'react';

// Martie brand colors
export const COLORS = {
  bg: '#FFFDF6',
  card: '#FFFFFF',
  cardBorder: '#E8E4D8',
  primary: '#FF5B50',
  correct: '#1FB763',
  wrong: '#D4D4D4',
  text: '#37140B',
  textSub: '#8B7355',
  accent: '#FF9F79',
  stripe: '#A3E635',
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Per-quiz timing (15s each)
// hook(2s) → question+countdown overlay(8s) → answer(5s) = 15s
export const QUIZ_DURATION_SEC = 15;
export const QUIZ_FRAMES = FPS * QUIZ_DURATION_SEC;

// Total: 3 quizzes (15s each) + CTA (4s) = 49s
export const QUIZ_COUNT = 3;
export const CTA_DURATION_SEC = 4;
export const TOTAL_FRAMES =
  QUIZ_FRAMES * QUIZ_COUNT + FPS * CTA_DURATION_SEC;

// Scene timing within each quiz (relative frames)
export const QUIZ_SCENES = {
  hook: {start: 0, duration: FPS * 2}, // 0-2s
  question: {start: FPS * 2, duration: FPS * 8}, // 2-10s (includes countdown overlay)
  countdown: {start: FPS * 7, duration: FPS * 3}, // 7-10s (overlaps question)
  answer: {start: FPS * 10, duration: FPS * 5}, // 10-15s
};

export const baseText: CSSProperties = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: COLORS.text,
  textAlign: 'center' as const,
};

// 콘텐츠가 적은 장면 (훅, 카운트다운, CTA) — 위쪽으로
export const container: CSSProperties = {
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.bg,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 60,
  paddingBottom: 300,
};

// 콘텐츠가 많은 장면 (문제, 정답) — 위쪽 정렬
export const containerFull: CSSProperties = {
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: COLORS.bg,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'flex-start',
  padding: 60,
  paddingTop: 320,
};

export type ProductEventName =
  | 'visit'
  | 'daily_quiz_started'
  | 'daily_quiz_completed'
  | 'practice_quiz_completed';

export type ProductEvent = {
  name: ProductEventName;
  occurredAt: number;
  utcOffsetMinutes: number;
  source: string;
  platform: string;
  language?: string;
};

export type ProductEventBatch = {
  visitorId: string;
  firstSeenAt: number;
  firstSeenUtcOffsetMinutes: number;
  isNewInstall: boolean;
  events: ProductEvent[];
};

export type FunnelCounts = {
  visits: number;
  dailyQuizStarted: number;
  dailyQuizCompleted: number;
  firstQuizCompleted: number;
  d1Eligible: number;
  d1Returned: number;
  d1QuizCompleted: number;
};

export type FunnelSegment = {
  source: string;
  platform: string;
  language: string;
  isNewInstall: boolean;
  counts: FunnelCounts;
};

export type FunnelPage = {
  segments: FunnelSegment[];
  isDone: boolean;
  continueCursor: string;
};

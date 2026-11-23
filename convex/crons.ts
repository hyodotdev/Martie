import {cronJobs} from 'convex/server';
import {internal} from './_generated/api';

const crons = cronJobs();

// 매일 00:00 UTC — 오늘의 퀴즈 생성
crons.daily(
  'generate daily challenge',
  {hourUTC: 0, minuteUTC: 0},
  internal.dailyChallenge.mutations.generateDaily,
);

// 매주 월요일 00:00 UTC — 리그 주간 리셋
crons.weekly(
  'weekly league reset',
  {dayOfWeek: 'monday', hourUTC: 0, minuteUTC: 0},
  internal.league.mutations.weeklyReset,
);

// 10분마다 — 방장이 사라진 대전 대기실 정리
crons.interval(
  'close stale battle rooms',
  {minutes: 10},
  internal.battle.mutations.sweepStaleRooms,
);

export default crons;

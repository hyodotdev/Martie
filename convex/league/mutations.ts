import {internalMutation, mutation} from '../_generated/server';
import {getAuthUserId} from '../utils/auth';

const LEAGUE_TIERS = ['bronze', 'silver', 'gold', 'diamond', 'master'] as const;
const GROUP_SIZE = 30;
const PROMOTE_COUNT = 5;
const DEMOTE_COUNT = 5;

/**
 * 현재 주의 월요일 날짜 반환 (UTC)
 */
function getWeekStartForDate(date: Date): string {
  const day = date.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() + diff);
  return monday.toISOString().split('T')[0];
}

function getWeekStart(): string {
  return getWeekStartForDate(new Date());
}

/**
 * 유저를 리그에 배정 (첫 참여 시)
 */
export const joinLeague = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const weekStart = getWeekStart();

    // 이미 리그에 있으면 스킵
    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .first();

    if (existing) {
      // 이번 주로 업데이트 안 되어 있으면 리셋
      if (existing.weekStart !== weekStart) {
        await ctx.db.patch(existing._id, {
          weeklyXp: 0,
          weekStart,
        });
      }
      return existing._id;
    }

    // Bronze 리그에서 빈 자리 있는 그룹 찾기
    const groupId = await findOrCreateGroup(ctx, 'bronze', weekStart);

    const id = await ctx.db.insert('leagues', {
      userId,
      tier: 'bronze',
      weeklyXp: 0,
      weekStart,
      groupId,
    });

    return id;
  },
});

/**
 * 주간 리그 리셋 (Cron에서 호출)
 * 승격/강등 처리 후 새 그룹 배정
 */
export const weeklyReset = internalMutation({
  args: {},
  handler: async (ctx) => {
    const newWeekStart = getWeekStart();

    // 그룹 단위로 처리 (전체 collect 대신 weekStart 인덱스 활용)
    // 지난 주 데이터만 처리
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStart = getWeekStartForDate(lastWeek);

    const lastWeekLeagues = await ctx.db
      .query('leagues')
      .withIndex('by_weekStart', (q) => q.eq('weekStart', lastWeekStart))
      .collect();

    // groupId별로 묶기
    const groups = new Map<string, typeof lastWeekLeagues>();
    for (const league of lastWeekLeagues) {
      const group = groups.get(league.groupId) ?? [];
      group.push(league);
      groups.set(league.groupId, group);
    }

    // 각 그룹별로 승격/강등 처리 + 새 그룹 배정을 동시에
    const tierCounters = new Map<string, number>();

    for (const [, members] of groups) {
      members.sort((a, b) => b.weeklyXp - a.weeklyXp);

      const tierIndex = LEAGUE_TIERS.indexOf(
        members[0].tier as (typeof LEAGUE_TIERS)[number],
      );

      for (let i = 0; i < members.length; i++) {
        const member = members[i];
        let newTier = member.tier;

        if (i < PROMOTE_COUNT && tierIndex < LEAGUE_TIERS.length - 1) {
          newTier = LEAGUE_TIERS[tierIndex + 1];
        } else if (
          i >= members.length - DEMOTE_COUNT &&
          tierIndex > 0 &&
          members.length > DEMOTE_COUNT
        ) {
          newTier = LEAGUE_TIERS[tierIndex - 1];
        }

        // 새 그룹 배정도 함께 처리
        const count = tierCounters.get(newTier) ?? 0;
        const groupIndex = Math.floor(count / GROUP_SIZE);
        const groupId = `${newTier}_${newWeekStart}_${groupIndex}`;
        tierCounters.set(newTier, count + 1);

        await ctx.db.patch(member._id, {
          tier: newTier,
          weeklyXp: 0,
          weekStart: newWeekStart,
          groupId,
        });
      }
    }
  },
});

/**
 * 스트릭 프리즈 구매 (벌브 10개)
 */
export const purchaseStreakFreeze = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const userProfile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .first();

    if (!userProfile) throw new Error('User profile not found');

    const bulbCount = userProfile.bulbCount ?? 0;
    if (bulbCount < 10) throw new Error('Not enough bulbs (need 10)');

    const streakFreezeCount = userProfile.streakFreezeCount ?? 0;

    await ctx.db.patch(userProfile._id, {
      bulbCount: bulbCount - 10,
      streakFreezeCount: streakFreezeCount + 1,
      updatedAt: new Date().toISOString(),
    });

    return {streakFreezeCount: streakFreezeCount + 1};
  },
});

/**
 * 빈 자리 있는 그룹 찾거나 새 그룹 생성
 */
async function findOrCreateGroup(
  ctx: any,
  tier: string,
  weekStart: string,
): Promise<string> {
  // 해당 tier의 현재 주 그룹들 확인
  const tierLeagues = await ctx.db
    .query('leagues')
    .withIndex('by_weekStart', (q: any) => q.eq('weekStart', weekStart))
    .filter((q: any) => q.eq(q.field('tier'), tier))
    .collect();

  // groupId별 인원 수 세기
  const groupCounts = new Map<string, number>();
  for (const league of tierLeagues) {
    const count = groupCounts.get(league.groupId) ?? 0;
    groupCounts.set(league.groupId, count + 1);
  }

  // 빈 자리 있는 그룹 찾기
  for (const [groupId, count] of groupCounts) {
    if (count < GROUP_SIZE) return groupId;
  }

  // 없으면 새 그룹 생성
  const nextIndex = groupCounts.size;
  return `${tier}_${weekStart}_${nextIndex}`;
}
